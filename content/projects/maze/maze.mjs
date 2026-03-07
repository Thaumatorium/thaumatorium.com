const COLOUR = {
	BLACK: { r: 0, g: 0, b: 0, a: 255 },
	BLUE: { r: 0, g: 102, b: 255, a: 180 },
	GREEN: { r: 0, g: 200, b: 120, a: 255 },
	RED: { r: 255, g: 64, b: 64, a: 255 },
};

const MAZE = {
	canvas: document.getElementById("maze"),
	ctx: document.getElementById("maze").getContext("2d"),
	image: new Image(),
	bitmap: null,
	scale: 10,
	startPoint: null,
	endPoint: null,
	searchOrder: [],
	solutionPath: [],
	animationId: null,
	visitedProgress: 0,
	pathProgress: 0,
	animationSpeed: 35,
	searchStrategy: "bfs",
};

const selectedMaze = document.getElementById("selected-maze");
const mazeScale = document.getElementById("maze-scale");
const searchStrategy = document.getElementById("search-strategy");
const animationSpeed = document.getElementById("animation-speed");
const animationSpeedValue = document.getElementById("animation-speed-value");
const playAnimation = document.getElementById("play-animation");

const getBitmapData = (image) => {
	const canvas = document.createElement("canvas");
	canvas.width = image.width;
	canvas.height = image.height;

	const context = canvas.getContext("2d");
	context.drawImage(image, 0, 0, image.width, image.height);

	const raw = context.getImageData(0, 0, image.width, image.height).data;
	const rows = [];

	rows.width = image.width;
	rows.height = image.height;

	for (let y = 0; y < image.height; y++) {
		const row = [];
		for (let x = 0; x < image.width; x++) {
			const offset = (y * image.width + x) * 4;
			row.push({
				r: raw[offset + 0],
				g: raw[offset + 1],
				b: raw[offset + 2],
				a: raw[offset + 3],
			});
		}
		rows.push(row);
	}

	return rows;
};

const isWalkable = (pixel) => pixel && pixel.r > 200 && pixel.g > 200 && pixel.b > 200;

const findOpening = (bitmap, edge) => {
	if (edge === "top") {
		for (let x = 0; x < bitmap.width; x++) {
			if (isWalkable(bitmap[0][x])) {
				return { x, y: 0 };
			}
		}
	}

	if (edge === "bottom") {
		const y = bitmap.height - 1;
		for (let x = 0; x < bitmap.width; x++) {
			if (isWalkable(bitmap[y][x])) {
				return { x, y };
			}
		}
	}

	return null;
};

const toKey = ({ x, y }) => `${x},${y}`;

const getNeighbours = (bitmap, { x, y }) => {
	const candidates = [
		{ x, y: y + 1 },
		{ x: x + 1, y },
		{ x: x - 1, y },
		{ x, y: y - 1 },
	];

	return candidates.filter(({ x: nextX, y: nextY }) => (
		nextY >= 0 &&
		nextY < bitmap.height &&
		nextX >= 0 &&
		nextX < bitmap.width &&
		isWalkable(bitmap[nextY][nextX])
	));
};

const solveMaze = (bitmap, start, end, strategy) => {
	const frontier = [start];
	const visited = new Set([toKey(start)]);
	const parentByNode = new Map();
	const searchOrder = [start];

	while (frontier.length > 0) {
		const current = strategy === "dfs" ? frontier.pop() : frontier.shift();

		if (current.x === end.x && current.y === end.y) {
			const path = [];
			let cursor = current;

			while (cursor) {
				path.push(cursor);
				cursor = parentByNode.get(toKey(cursor));
			}

			path.reverse();
			return { searchOrder, path };
		}

		for (const neighbour of getNeighbours(bitmap, current)) {
			const key = toKey(neighbour);
			if (visited.has(key)) {
				continue;
			}

			visited.add(key);
			parentByNode.set(key, current);
			frontier.push(neighbour);
			searchOrder.push(neighbour);
		}
	}

	return { searchOrder, path: [] };
};

const resizeCanvas = () => {
	MAZE.canvas.width = MAZE.image.width * MAZE.scale;
	MAZE.canvas.height = MAZE.image.height * MAZE.scale;
	MAZE.ctx.setTransform(MAZE.scale, 0, 0, MAZE.scale, 0, 0);
	MAZE.ctx.imageSmoothingEnabled = false;
};

const drawPixel = (x, y, colour) => {
	MAZE.ctx.fillStyle = `rgba(${colour.r},${colour.g},${colour.b},${colour.a / 255})`;
	MAZE.ctx.fillRect(x, y, 1, 1);
};

const render = (visitedCount = 0, pathCount = 0) => {
	MAZE.ctx.clearRect(0, 0, MAZE.image.width, MAZE.image.height);
	MAZE.ctx.drawImage(MAZE.image, 0, 0, MAZE.image.width, MAZE.image.height);

	for (let i = 0; i < visitedCount; i++) {
		const point = MAZE.searchOrder[i];
		if (point) {
			drawPixel(point.x, point.y, COLOUR.BLUE);
		}
	}

	for (let i = 0; i < pathCount; i++) {
		const point = MAZE.solutionPath[i];
		if (point) {
			drawPixel(point.x, point.y, COLOUR.GREEN);
		}
	}

	if (MAZE.startPoint) {
		drawPixel(MAZE.startPoint.x, MAZE.startPoint.y, COLOUR.RED);
	}

	if (MAZE.endPoint) {
		drawPixel(MAZE.endPoint.x, MAZE.endPoint.y, COLOUR.RED);
	}
};

const cancelAnimation = () => {
	if (MAZE.animationId !== null) {
		cancelAnimationFrame(MAZE.animationId);
		MAZE.animationId = null;
	}
};

const animateSolution = () => {
	const step = () => {
		const speedFactor = Math.max(1, MAZE.animationSpeed);
		const visitedStep = Math.max(1, Math.ceil((MAZE.searchOrder.length * speedFactor) / 4000));
		const pathStep = Math.max(1, Math.ceil((MAZE.solutionPath.length * speedFactor) / 2500));

		if (MAZE.visitedProgress < MAZE.searchOrder.length) {
			MAZE.visitedProgress = Math.min(MAZE.searchOrder.length, MAZE.visitedProgress + visitedStep);
		} else if (MAZE.pathProgress < MAZE.solutionPath.length) {
			MAZE.pathProgress = Math.min(MAZE.solutionPath.length, MAZE.pathProgress + pathStep);
		}

		render(MAZE.visitedProgress, MAZE.pathProgress);

		if (MAZE.visitedProgress < MAZE.searchOrder.length || MAZE.pathProgress < MAZE.solutionPath.length) {
			MAZE.animationId = requestAnimationFrame(step);
			return;
		}

		MAZE.animationId = null;
	};

	MAZE.visitedProgress = 0;
	MAZE.pathProgress = 0;
	MAZE.animationId = requestAnimationFrame(step);
};

const recalculateSolution = () => {
	if (!MAZE.bitmap) {
		return;
	}

	MAZE.startPoint = findOpening(MAZE.bitmap, "top");
	MAZE.endPoint = findOpening(MAZE.bitmap, "bottom");

	if (!MAZE.startPoint || !MAZE.endPoint) {
		MAZE.searchOrder = [];
		MAZE.solutionPath = [];
		render();
		return;
	}

	const { searchOrder, path } = solveMaze(MAZE.bitmap, MAZE.startPoint, MAZE.endPoint, MAZE.searchStrategy);
	MAZE.searchOrder = searchOrder;
	MAZE.solutionPath = path;
	render();
};

const loadMaze = () => {
	cancelAnimation();
	MAZE.image.src = selectedMaze.value;
};

MAZE.image.onload = () => {
	MAZE.bitmap = getBitmapData(MAZE.image);
	MAZE.scale = parseInt(mazeScale.value, 10);
	resizeCanvas();
	recalculateSolution();
};

selectedMaze.onchange = () => {
	loadMaze();
};

mazeScale.onchange = () => {
	MAZE.scale = parseInt(mazeScale.value, 10);
	resizeCanvas();
	render();
};

searchStrategy.onchange = () => {
	cancelAnimation();
	MAZE.searchStrategy = searchStrategy.value;
	recalculateSolution();
};

animationSpeed.oninput = () => {
	MAZE.animationSpeed = parseInt(animationSpeed.value, 10);
	animationSpeedValue.value = animationSpeed.value;
};

playAnimation.onclick = () => {
	cancelAnimation();
	recalculateSolution();

	if (MAZE.solutionPath.length === 0) {
		console.warn("No solution found for the selected maze.");
		return;
	}

	animateSolution();
};

MAZE.animationSpeed = parseInt(animationSpeed.value, 10);
animationSpeedValue.value = animationSpeed.value;
MAZE.searchStrategy = searchStrategy.value;

loadMaze();
