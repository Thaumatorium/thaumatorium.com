const COLOUR = {
	BACKGROUND: "#ffffff",
	UNTOUCHED: "#000000",
	UNTOUCHED_WALL: "#d6d6d6",
	WALL: "#111111",
	VISITED: "#2563eb",
	DEAD_END: "#dc2626",
	PATH: "#22c55e",
	START: "#15803d",
	END: "#b91c1c",
	ORIGIN: "#d97706",
};

const MAZE = {
	canvas: document.getElementById("maze"),
	ctx: document.getElementById("maze").getContext("2d"),
	width: 40,
	height: 40,
	cellSize: 30,
	generationCoverage: 95,
	generationTimeLimitMs: 5000,
	animationSpeed: 35,
	searchStrategy: "bfs",
	grid: null,
	animationId: null,
	searchOrder: [],
	deadEndOrder: [],
	solutionPath: [],
	visitedProgress: 0,
	deadEndProgress: 0,
	pathProgress: 0,
	dfsSearchBudget: 0,
	dfsPathBudget: 0,
	showUntouchedCells: false,
	showCrawlers: false,
	status: document.getElementById("maze-status"),
	hasDoneInitialGeneration: false,
};

const widthInput = document.getElementById("maze-width");
const heightInput = document.getElementById("maze-height");
const cellSizeInput = document.getElementById("cell-size");
const generationCoverageInput = document.getElementById("generation-coverage");
const generationTimeLimitInput = document.getElementById("generation-time-limit");
const searchStrategyInput = document.getElementById("search-strategy");
const animationSpeedInput = document.getElementById("animation-speed");
const animationSpeedValue = document.getElementById("animation-speed-value");
const generateButton = document.getElementById("generate-maze");
const solveButton = document.getElementById("solve-maze");

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
const randomInt = (max) => Math.floor(Math.random() * max);
const indexOf = (grid, x, y) => y * grid.width + x;
const coordsOf = (grid, index) => ({ x: index % grid.width, y: Math.floor(index / grid.width) });
const toKey = ({ x, y }) => `${x},${y}`;
const getSpeedFactor = () => Math.max(0.02, (MAZE.animationSpeed / 100) ** 2 * 12);
const getEffectiveGenerationTimeLimitMs = () => (
	Math.max(50, Math.round(MAZE.generationTimeLimitMs / getSpeedFactor()))
);
const shuffle = (items) => {
	const result = [...items];
	for (let i = result.length - 1; i > 0; i--) {
		const j = randomInt(i + 1);
		[result[i], result[j]] = [result[j], result[i]];
	}
	return result;
};

const setStatus = (message) => {
	MAZE.status.textContent = message;
};

const getGenerationSummary = () => (
	`${MAZE.generationCoverage}% coverage or ${getEffectiveGenerationTimeLimitMs()} ms at current speed`
);

const getCornerCrawlerStarts = (width, height) => {
	const corners = [
		indexOf({ width }, 0, 0),
		indexOf({ width }, width - 1, 0),
		indexOf({ width }, 0, height - 1),
		indexOf({ width }, width - 1, height - 1),
	];

	return [...new Set(corners)];
};

const createInitialGrid = (width, height) => {
	const size = width * height;
	const parent = new Array(size);
	const crawlers = getCornerCrawlerStarts(width, height);

	for (let y = 0; y < height; y++) {
		for (let x = 0; x < width; x++) {
			const index = indexOf({ width }, x, y);
			if (x === 0 && y === 0) {
				parent[index] = -1;
			} else if (x > 0) {
				parent[index] = indexOf({ width }, x - 1, y);
			} else {
				parent[index] = indexOf({ width }, x, y - 1);
			}
		}
	}

	return {
		width,
		height,
		parent,
		origin: crawlers[0],
		crawlers,
		shiftCount: 0,
		visitedByOrigin: new Set(crawlers),
		start: 0,
		end: size - 1,
	};
};

const getNeighbourIndices = (grid, index) => {
	const { x, y } = coordsOf(grid, index);
	const neighbours = [];

	if (y > 0) neighbours.push(indexOf(grid, x, y - 1));
	if (x < grid.width - 1) neighbours.push(indexOf(grid, x + 1, y));
	if (y < grid.height - 1) neighbours.push(indexOf(grid, x, y + 1));
	if (x > 0) neighbours.push(indexOf(grid, x - 1, y));

	return neighbours;
};

const shiftOrigin = (grid) => {
	const neighbours = getNeighbourIndices(grid, grid.origin);
	const nextOrigin = neighbours[randomInt(neighbours.length)];

	grid.parent[grid.origin] = nextOrigin;
	grid.parent[nextOrigin] = -1;
	grid.origin = nextOrigin;
	grid.shiftCount += 1;
	grid.visitedByOrigin.add(nextOrigin);
};

const rerootAt = (grid, newRoot) => {
	if (grid.origin === newRoot) {
		return;
	}

	let current = newRoot;
	let previous = -1;

	while (current !== -1) {
		const next = grid.parent[current];
		grid.parent[current] = previous;
		previous = current;
		current = next;
	}

	grid.origin = newRoot;
};

const shiftCrawler = (grid, crawlerIndex) => {
	const crawlerPosition = grid.crawlers[crawlerIndex];
	rerootAt(grid, crawlerPosition);
	shiftOrigin(grid);
	grid.crawlers[crawlerIndex] = grid.origin;
};

const areConnected = (grid, first, second) => (
	grid.parent[first] === second || grid.parent[second] === first
);

const getConnectedNeighbours = (grid, index) => (
	shuffle(getNeighbourIndices(grid, index).filter((neighbour) => areConnected(grid, index, neighbour)))
);

const resizeCanvas = () => {
	const width = MAZE.width * MAZE.cellSize + 1;
	const height = MAZE.height * MAZE.cellSize + 1;

	MAZE.canvas.width = width;
	MAZE.canvas.height = height;
};

const fillCell = (index, fillStyle, inset = 0) => {
	const { x, y } = coordsOf(MAZE.grid, index);
	const cellSize = MAZE.cellSize;

	MAZE.ctx.fillStyle = fillStyle;
	MAZE.ctx.fillRect(
		x * cellSize + inset,
		y * cellSize + inset,
		Math.max(1, cellSize - inset * 2 + 1),
		Math.max(1, cellSize - inset * 2 + 1),
	);
};

const isUntouched = (index) => (
	MAZE.showUntouchedCells &&
	MAZE.grid.visitedByOrigin &&
	!MAZE.grid.visitedByOrigin.has(index)
);

const getWallColour = (current, neighbour) => {
	const currentUntouched = isUntouched(current);
	const neighbourUntouched = neighbour >= 0 ? isUntouched(neighbour) : currentUntouched;

	if (currentUntouched && neighbourUntouched) {
		return COLOUR.UNTOUCHED_WALL;
	}

	return COLOUR.WALL;
};

const drawWalls = () => {
	const { ctx, cellSize, grid } = MAZE;
	ctx.lineWidth = 2;

	for (let y = 0; y < grid.height; y++) {
		for (let x = 0; x < grid.width; x++) {
			const index = indexOf(grid, x, y);
			const left = x * cellSize;
			const top = y * cellSize;
			const right = left + cellSize;
			const bottom = top + cellSize;

			const north = y > 0 ? indexOf(grid, x, y - 1) : -1;
			const west = x > 0 ? indexOf(grid, x - 1, y) : -1;
			const south = y < grid.height - 1 ? indexOf(grid, x, y + 1) : -1;
			const east = x < grid.width - 1 ? indexOf(grid, x + 1, y) : -1;

			if (north === -1 || !areConnected(grid, index, north)) {
				ctx.strokeStyle = getWallColour(index, north);
				ctx.beginPath();
				ctx.moveTo(left, top);
				ctx.lineTo(right, top);
				ctx.stroke();
			}

			if (west === -1 || !areConnected(grid, index, west)) {
				ctx.strokeStyle = getWallColour(index, west);
				ctx.beginPath();
				ctx.moveTo(left, top);
				ctx.lineTo(left, bottom);
				ctx.stroke();
			}

			if (south === -1 || !areConnected(grid, index, south)) {
				ctx.strokeStyle = getWallColour(index, south);
				ctx.beginPath();
				ctx.moveTo(left, bottom);
				ctx.lineTo(right, bottom);
				ctx.stroke();
			}

			if (east === -1 || !areConnected(grid, index, east)) {
				ctx.strokeStyle = getWallColour(index, east);
				ctx.beginPath();
				ctx.moveTo(right, top);
				ctx.lineTo(right, bottom);
				ctx.stroke();
			}
		}
	}
};

const render = () => {
	if (!MAZE.grid) {
		return;
	}

	MAZE.ctx.fillStyle = COLOUR.BACKGROUND;
	MAZE.ctx.fillRect(0, 0, MAZE.canvas.width, MAZE.canvas.height);

	if (MAZE.showUntouchedCells && MAZE.grid.visitedByOrigin) {
		for (let index = 0; index < MAZE.grid.parent.length; index++) {
			if (!MAZE.grid.visitedByOrigin.has(index)) {
				fillCell(index, COLOUR.UNTOUCHED);
			}
		}
	}

	for (let i = 0; i < MAZE.visitedProgress; i++) {
		fillCell(MAZE.searchOrder[i], COLOUR.VISITED);
	}

	for (let i = 0; i < MAZE.deadEndProgress; i++) {
		fillCell(MAZE.deadEndOrder[i], COLOUR.DEAD_END);
	}

	for (let i = 0; i < MAZE.pathProgress; i++) {
		fillCell(MAZE.solutionPath[i], COLOUR.PATH);
	}

	fillCell(MAZE.grid.start, COLOUR.START, 4);
	fillCell(MAZE.grid.end, COLOUR.END, 4);
	if (MAZE.showCrawlers) {
		for (const crawler of MAZE.grid.crawlers) {
			fillCell(crawler, COLOUR.ORIGIN, 5);
		}
	}

	drawWalls();
};

const cancelAnimation = () => {
	if (MAZE.animationId !== null) {
		cancelAnimationFrame(MAZE.animationId);
		MAZE.animationId = null;
	}
};

const runGeneration = () => {
	cancelAnimation();
	MAZE.searchOrder = [];
	MAZE.deadEndOrder = [];
	MAZE.solutionPath = [];
	MAZE.visitedProgress = 0;
	MAZE.deadEndProgress = 0;
	MAZE.pathProgress = 0;
	MAZE.showUntouchedCells = true;
	MAZE.showCrawlers = true;
	MAZE.grid = createInitialGrid(MAZE.width, MAZE.height);
	resizeCanvas();
	render();

	const generationStartTime = performance.now();
	let lastFrameTime = generationStartTime;
	let generationBudget = 0;
	setStatus(`Generating ${MAZE.width} x ${MAZE.height} maze with Origin Shift using ${getGenerationSummary()}...`);

	const step = () => {
		const now = performance.now();
		const speedFactor = getSpeedFactor();
		const totalCells = MAZE.width * MAZE.height;
		const targetVisitedCells = Math.max(1, Math.ceil((totalCells * MAZE.generationCoverage) / 100));
		const elapsedMs = now - generationStartTime;
		const frameDelta = now - lastFrameTime;
		lastFrameTime = now;
		const effectiveTimeLimitMs = getEffectiveGenerationTimeLimitMs();
		const generationDone = (
			MAZE.grid.visitedByOrigin.size >= targetVisitedCells ||
			elapsedMs >= effectiveTimeLimitMs
		);
		const remainingCells = targetVisitedCells - MAZE.grid.visitedByOrigin.size;
		generationBudget += ((Math.max(remainingCells, 1) * speedFactor) / 12) * (frameDelta / 16.67);

		while (generationBudget >= 1 && !generationDone) {
			generationBudget -= 1;
			const crawlerIndex = randomInt(MAZE.grid.crawlers.length);
			shiftCrawler(MAZE.grid, crawlerIndex);
			if (
				MAZE.grid.visitedByOrigin.size >= targetVisitedCells ||
				performance.now() - generationStartTime >= effectiveTimeLimitMs
			) {
				break;
			}
		}

		render();

		const doneNow = (
			MAZE.grid.visitedByOrigin.size >= targetVisitedCells ||
			performance.now() - generationStartTime >= effectiveTimeLimitMs
		);

		if (!doneNow) {
			MAZE.animationId = requestAnimationFrame(step);
			return;
		}

		MAZE.animationId = null;
		MAZE.showUntouchedCells = false;
		MAZE.showCrawlers = false;
		if (!MAZE.hasDoneInitialGeneration) {
			MAZE.hasDoneInitialGeneration = true;
			MAZE.animationSpeed = 10;
			animationSpeedInput.value = "10";
			animationSpeedValue.value = "10";
		}
		render();
		setStatus(`Generated ${MAZE.width} x ${MAZE.height} maze after touching ${MAZE.grid.visitedByOrigin.size}/${totalCells} cells in ${MAZE.grid.shiftCount} origin shifts.`);
	};

	MAZE.animationId = requestAnimationFrame(step);
};

const solveMaze = (grid, strategy) => {
	const frontier = [grid.start];
	const visited = new Set([grid.start]);
	const parentByNode = new Map();
	const searchOrder = [grid.start];

	while (frontier.length > 0) {
		const current = strategy === "dfs" ? frontier.pop() : frontier.shift();

		if (current === grid.end) {
			const path = [];
			let cursor = current;

			while (cursor !== undefined) {
				path.push(cursor);
				cursor = parentByNode.get(cursor);
			}

			path.reverse();
			return { searchOrder, path };
		}

		for (const neighbour of getConnectedNeighbours(grid, current)) {
			if (visited.has(neighbour)) {
				continue;
			}

			visited.add(neighbour);
			parentByNode.set(neighbour, current);
			frontier.push(neighbour);
			searchOrder.push(neighbour);
		}
	}

	return { searchOrder, path: [] };
};

const animateSolveDFS = () => {
	const visited = new Set([MAZE.grid.start]);
	const stack = [MAZE.grid.start];

	MAZE.searchOrder = [MAZE.grid.start];
	MAZE.deadEndOrder = [];
	MAZE.solutionPath = [];
	MAZE.visitedProgress = 1;
	MAZE.deadEndProgress = 0;
	MAZE.pathProgress = 0;
	MAZE.dfsSearchBudget = 0;
	MAZE.dfsPathBudget = 0;

	setStatus("Solving maze with DFS...");

	const step = () => {
		const speedFactor = getSpeedFactor();
		MAZE.dfsSearchBudget += (MAZE.grid.width * MAZE.grid.height * speedFactor) / 7000;

		while (MAZE.dfsSearchBudget >= 1) {
			MAZE.dfsSearchBudget -= 1;
			const current = stack[stack.length - 1];

			if (current === undefined) {
				MAZE.animationId = null;
				setStatus("No path found. That should not happen in a perfect maze.");
				render();
				return;
			}

			if (current === MAZE.grid.end) {
				MAZE.solutionPath = [...stack];
				break;
			}

			const next = getConnectedNeighbours(MAZE.grid, current).find((neighbour) => !visited.has(neighbour));

			if (next !== undefined) {
				visited.add(next);
				stack.push(next);
				MAZE.searchOrder.push(next);
				MAZE.visitedProgress = MAZE.searchOrder.length;
				continue;
			}

			const deadNode = stack.pop();
			if (deadNode !== MAZE.grid.start) {
				MAZE.deadEndOrder.push(deadNode);
				MAZE.deadEndProgress = MAZE.deadEndOrder.length;
			}
		}

		if (MAZE.solutionPath.length > 0) {
			MAZE.dfsPathBudget += (MAZE.solutionPath.length * speedFactor) / 3000;
			while (MAZE.dfsPathBudget >= 1 && MAZE.pathProgress < MAZE.solutionPath.length) {
				MAZE.dfsPathBudget -= 1;
				MAZE.pathProgress += 1;
			}
		}

		render();

		if (MAZE.solutionPath.length === 0 || MAZE.pathProgress < MAZE.solutionPath.length) {
			MAZE.animationId = requestAnimationFrame(step);
			return;
		}

		MAZE.animationId = null;
		setStatus(`DFS visited ${MAZE.searchOrder.length} cells and found a path of length ${MAZE.solutionPath.length}.`);
	};

	MAZE.animationId = requestAnimationFrame(step);
};

const animateSolve = () => {
	if (!MAZE.grid) {
		return;
	}

	cancelAnimation();

	if (MAZE.searchStrategy === "dfs") {
		animateSolveDFS();
		return;
	}

	const { searchOrder, path } = solveMaze(MAZE.grid, MAZE.searchStrategy);
	MAZE.searchOrder = searchOrder;
	MAZE.deadEndOrder = searchOrder.filter((index) => !path.includes(index)).reverse();
	MAZE.solutionPath = path;
	MAZE.visitedProgress = 0;
	MAZE.deadEndProgress = 0;
	MAZE.pathProgress = 0;

	if (path.length === 0) {
		render();
		setStatus("No path found. That should not happen in a perfect maze.");
		return;
	}

	setStatus(`Solving maze with ${MAZE.searchStrategy.toUpperCase()}...`);

	const step = () => {
		const speedFactor = getSpeedFactor();
		const visitedStep = Math.max(1, Math.ceil((MAZE.searchOrder.length * speedFactor) / 4500));
		const deadEndStep = Math.max(1, Math.ceil((MAZE.deadEndOrder.length * speedFactor) / 3500));
		const pathStep = Math.max(1, Math.ceil((MAZE.solutionPath.length * speedFactor) / 3000));

		if (MAZE.visitedProgress < MAZE.searchOrder.length) {
			MAZE.visitedProgress = Math.min(MAZE.searchOrder.length, MAZE.visitedProgress + visitedStep);
		} else if (MAZE.deadEndProgress < MAZE.deadEndOrder.length) {
			MAZE.deadEndProgress = Math.min(MAZE.deadEndOrder.length, MAZE.deadEndProgress + deadEndStep);
		} else if (MAZE.pathProgress < MAZE.solutionPath.length) {
			MAZE.pathProgress = Math.min(MAZE.solutionPath.length, MAZE.pathProgress + pathStep);
		}

		render();

		if (
			MAZE.visitedProgress < MAZE.searchOrder.length ||
			MAZE.deadEndProgress < MAZE.deadEndOrder.length ||
			MAZE.pathProgress < MAZE.solutionPath.length
		) {
			MAZE.animationId = requestAnimationFrame(step);
			return;
		}

		MAZE.animationId = null;
		setStatus(`${MAZE.searchStrategy.toUpperCase()} visited ${MAZE.searchOrder.length} cells and found a path of length ${MAZE.solutionPath.length}.`);
	};

	MAZE.animationId = requestAnimationFrame(step);
};

const applySettings = () => {
	MAZE.width = clamp(parseInt(widthInput.value, 10) || 20, 4, 80);
	MAZE.height = clamp(parseInt(heightInput.value, 10) || 20, 4, 80);
	MAZE.cellSize = clamp(parseInt(cellSizeInput.value, 10) || 18, 8, 40);
	MAZE.generationCoverage = clamp(parseInt(generationCoverageInput.value, 10) || 95, 1, 100);
	MAZE.generationTimeLimitMs = clamp(parseInt(generationTimeLimitInput.value, 10) || 5000, 50, 10000);
	MAZE.searchStrategy = searchStrategyInput.value;

	widthInput.value = MAZE.width;
	heightInput.value = MAZE.height;
	cellSizeInput.value = MAZE.cellSize;
	generationCoverageInput.value = MAZE.generationCoverage;
	generationTimeLimitInput.value = MAZE.generationTimeLimitMs;
};

animationSpeedInput.oninput = () => {
	MAZE.animationSpeed = parseInt(animationSpeedInput.value, 10);
	animationSpeedValue.value = animationSpeedInput.value;
};

searchStrategyInput.onchange = () => {
	MAZE.searchStrategy = searchStrategyInput.value;
	if (MAZE.grid && MAZE.animationId === null) {
		MAZE.searchOrder = [];
		MAZE.deadEndOrder = [];
		MAZE.solutionPath = [];
		MAZE.visitedProgress = 0;
		MAZE.deadEndProgress = 0;
		MAZE.pathProgress = 0;
		render();
		setStatus(`Ready to solve with ${MAZE.searchStrategy.toUpperCase()}.`);
	}
};

cellSizeInput.onchange = () => {
	applySettings();
	if (MAZE.grid) {
		resizeCanvas();
		render();
	}
};

generateButton.onclick = () => {
	applySettings();
	runGeneration();
};

solveButton.onclick = () => {
	applySettings();
	animateSolve();
};

MAZE.animationSpeed = 100;
animationSpeedInput.value = "100";
animationSpeedValue.value = "100";
applySettings();
setStatus(`Ready to generate a ${MAZE.width} x ${MAZE.height} maze with ${getGenerationSummary()}.`);
runGeneration();
