const randomExponential = (rate) => -Math.log(1 - Math.random()) / rate;

let spareNormal = null;
function normalRandom() {
  if (spareNormal !== null) {
    const value = spareNormal;
    spareNormal = null;
    return value;
  }
  let u;
  let v;
  let s;
  do {
    u = Math.random() * 2 - 1;
    v = Math.random() * 2 - 1;
    s = u * u + v * v;
  } while (s === 0 || s >= 1);
  const mul = Math.sqrt(-2 * Math.log(s) / s);
  spareNormal = v * mul;
  return u * mul;
}

function randomGamma(shape, scale) {
  if (shape === 1) return randomExponential(1 / scale);
  if (shape < 1) {
    const u = Math.random();
    return randomGamma(shape + 1, scale) * Math.pow(u, 1 / shape);
  }
  const d = shape - 1 / 3;
  const c = 1 / Math.sqrt(9 * d);
  while (true) {
    let x;
    let v;
    do {
      x = normalRandom();
      v = 1 + c * x;
    } while (v <= 0);
    v = v * v * v;
    const u = Math.random();
    if (u < 1 - 0.0331 * x * x * x * x) return scale * d * v;
    if (Math.log(u) < 0.5 * x * x + d * (1 - v + Math.log(v))) return scale * d * v;
  }
}

function formatNumber(value, digits = 2) {
  return Number.isFinite(value) ? value.toFixed(digits) : "0.00";
}

function clampNumber(value, min, max, fallback) {
  const num = Number(value);
  if (!Number.isFinite(num)) return fallback;
  return Math.min(Math.max(num, min), max);
}

class QueueSimulation {
  constructor() {
    this.config = {
      servers: 2,
      capacity: 10,
      arrivalRate: 1.2,
      meanService: 0.7,
      serviceCv: 0.8,
      serviceDistribution: "gamma",
      speed: 10,
      warmupTime: 60,
      measurementTime: 300,
    };

    this.elements = {
      queue: document.getElementById("queueArea"),
      serverSlots: Array.from(document.querySelectorAll(".slot")),
      serverPanels: Array.from(document.querySelectorAll(".queue-sim-server")),
      simTime: document.getElementById("simTime"),
      simPhase: document.getElementById("simPhase"),
      measuredTime: document.getElementById("measuredTime"),
      inSystem: document.getElementById("inSystem"),
      inQueue: document.getElementById("inQueue"),
      busyServers: document.getElementById("busyServers"),
      arrivals: document.getElementById("arrivals"),
      served: document.getElementById("served"),
      dropped: document.getElementById("dropped"),
      throughput: document.getElementById("throughput"),
      avgWait: document.getElementById("avgWait"),
      avgSystem: document.getElementById("avgSystem"),
      util1: document.getElementById("util1"),
      util2: document.getElementById("util2"),
      rho: document.getElementById("rho"),
      avgQueueLen: document.getElementById("avgQueueLen"),
      avgSystemLen: document.getElementById("avgSystemLen"),
      dropRate: document.getElementById("dropRate"),
      distributionLabel: document.getElementById("distributionLabel"),
      historyChart: document.getElementById("historyChart"),
    };

    this.canvas = document.querySelector(".queue-sim-canvas");
    this.layer = document.getElementById("customerLayer");
    this.entryAnchor = document.querySelector(".queue-sim-cloud .queue-sim-arrow");
    this.exitAnchor = document.querySelector(".queue-sim-exit .queue-sim-arrow");
    this.customerElements = new Map();
    this.customerSize = 36;
    this.queueSpacing = 44;
    this.queueRowHeight = 44;
    this.history = [];
    this.running = false;

    this.handleResize = this.handleResize.bind(this);
    window.addEventListener("resize", this.handleResize);
    this.refreshLayout();
    this.reset();
  }

  refreshLayout() {
    this.canvasRect = this.canvas.getBoundingClientRect();
    this.queueRect = this.elements.queue.getBoundingClientRect();
    this.serverRects = this.elements.serverSlots.map((slot) => slot.getBoundingClientRect());
    this.entryRect = this.entryAnchor.getBoundingClientRect();
    this.exitRect = this.exitAnchor.getBoundingClientRect();
  }

  handleResize() {
    clearTimeout(this._resizeTimer);
    this._resizeTimer = setTimeout(() => {
      this.refreshLayout();
      this.updateAllPositions(true);
      this.renderHistory();
    }, 100);
  }

  reset() {
    this.simTime = 0;
    this.lastRealTime = null;
    this.measurementStarted = false;
    this.measurementCompleted = false;
    this.queue = [];
    this.systemCount = 0;
    this.customerId = 1;
    this.customerElements.forEach((element) => element.remove());
    this.customerElements.clear();
    this.layer.innerHTML = "";

    this.nextArrival = { time: randomExponential(this.config.arrivalRate) };
    this.servers = Array.from({ length: this.config.servers }, () => ({
      busy: false,
      customer: null,
      nextDeparture: Infinity,
      busyTimeTotal: 0,
      busyTimeMeasured: 0,
    }));

    this.metrics = {
      measuredDuration: 0,
      arrivals: 0,
      served: 0,
      dropped: 0,
      waitTimeSum: 0,
      systemTimeSum: 0,
      queueArea: 0,
      systemArea: 0,
    };

    this.history = [];
    this.updateAllPositions(true);
    this.render();
  }

  updateConfig(newConfig) {
    Object.assign(this.config, newConfig);
    this.reset();
  }

  start() {
    if (this.running) return;
    this.running = true;
    this.lastRealTime = performance.now();
    this.animationFrame = requestAnimationFrame(() => this.tick());
  }

  pause() {
    if (!this.running) return;
    this.running = false;
    cancelAnimationFrame(this.animationFrame);
    this.animationFrame = null;
  }

  tick() {
    if (!this.running) return;
    const now = performance.now();
    const realDelta = (now - this.lastRealTime) / 1000;
    this.lastRealTime = now;
    const targetSimTime = this.simTime + realDelta * this.config.speed;
    this.advanceTo(targetSimTime);
    this.render();
    if (this.measurementCompleted) {
      this.pause();
      return;
    }
    this.animationFrame = requestAnimationFrame(() => this.tick());
  }

  advanceTo(targetTime) {
    while (true) {
      const nextEvent = this.nextEventTime();
      if (nextEvent > targetTime) break;
      this.advanceClock(nextEvent);
      if (nextEvent === this.nextArrival.time) {
        this.handleArrival();
      } else {
        const serverIndex = this.servers.findIndex((server) => server.nextDeparture === nextEvent);
        if (serverIndex >= 0) this.handleDeparture(serverIndex);
        else break;
      }
      if (this.measurementCompleted) break;
    }
    this.advanceClock(Math.min(targetTime, this.config.warmupTime + this.config.measurementTime));
  }

  nextEventTime() {
    let minTime = this.nextArrival.time;
    for (const server of this.servers) {
      if (server.nextDeparture < minTime) minTime = server.nextDeparture;
    }
    return minTime;
  }

  advanceClock(newTime) {
    const dt = newTime - this.simTime;
    if (dt <= 0) {
      this.simTime = newTime;
      return;
    }

    const measurementStart = this.config.warmupTime;
    const measurementEnd = measurementStart + this.config.measurementTime;
    const measuredFrom = Math.max(this.simTime, measurementStart);
    const measuredTo = Math.min(newTime, measurementEnd);
    const measuredDt = Math.max(measuredTo - measuredFrom, 0);

    if (measuredDt > 0) {
      this.measurementStarted = true;
      const queueLen = Math.max(this.systemCount - this.busyServerCount(), 0);
      this.metrics.measuredDuration += measuredDt;
      this.metrics.queueArea += queueLen * measuredDt;
      this.metrics.systemArea += this.systemCount * measuredDt;
      for (const server of this.servers) {
        if (server.busy) server.busyTimeMeasured += measuredDt;
      }
    }

    for (const server of this.servers) {
      if (server.busy) server.busyTimeTotal += dt;
    }

    this.simTime = newTime;
    if (this.simTime >= measurementEnd) this.measurementCompleted = true;
    this.recordHistory();
  }

  inMeasurementWindow() {
    return this.simTime >= this.config.warmupTime && this.simTime <= this.config.warmupTime + this.config.measurementTime;
  }

  handleArrival() {
    const customer = {
      id: this.customerId++,
      arrivalTime: this.simTime,
      measuredArrival: this.inMeasurementWindow(),
      serviceStart: null,
      departureTime: null,
    };

    this.createCustomerElement(customer);
    if (customer.measuredArrival) this.metrics.arrivals += 1;

    if (this.systemCount >= this.config.capacity) {
      if (customer.measuredArrival) this.metrics.dropped += 1;
      this.rejectCustomer(customer);
    } else {
      this.systemCount += 1;
      const freeServerIndex = this.servers.findIndex((server) => !server.busy);
      if (freeServerIndex >= 0 && this.queue.length === 0) {
        this.startService(freeServerIndex, customer, true);
      } else {
        this.queue.push(customer);
        this.updateQueuePositions();
        if (freeServerIndex >= 0) {
          const nextCustomer = this.queue.shift();
          this.startService(freeServerIndex, nextCustomer);
          this.updateQueuePositions();
        }
      }
    }

    this.nextArrival.time = this.simTime + randomExponential(this.config.arrivalRate);
  }

  startService(serverIndex, customer, directFromArrival = false) {
    const server = this.servers[serverIndex];
    server.busy = true;
    server.customer = customer;
    customer.serviceStart = this.simTime;
    server.nextDeparture = this.simTime + this.generateServiceTime();
    if (directFromArrival) this.animateDirectService(customer, serverIndex);
    else this.moveCustomerToServer(customer, serverIndex);
    this.renderServers();
  }

  handleDeparture(serverIndex) {
    const server = this.servers[serverIndex];
    const customer = server.customer;
    if (!customer) return;
    customer.departureTime = this.simTime;
    if (customer.measuredArrival && this.simTime >= this.config.warmupTime) {
      this.metrics.served += 1;
      this.metrics.waitTimeSum += customer.serviceStart - customer.arrivalTime;
      this.metrics.systemTimeSum += customer.departureTime - customer.arrivalTime;
    }

    this.systemCount -= 1;
    this.sendCustomerToExit(customer.id);
    if (this.queue.length > 0) {
      const nextCustomer = this.queue.shift();
      this.startService(serverIndex, nextCustomer);
      this.updateQueuePositions();
    } else {
      server.busy = false;
      server.customer = null;
      server.nextDeparture = Infinity;
    }
    this.renderServers();
  }

  busyServerCount() {
    return this.servers.filter((server) => server.busy).length;
  }

  generateServiceTime() {
    const mean = this.config.meanService;
    if (this.config.serviceDistribution === "deterministic") return mean;
    if (this.config.serviceDistribution === "exponential") return Math.max(1e-4, randomExponential(1 / mean));
    const cv = this.config.serviceCv;
    if (cv === 0) return mean;
    const shape = 1 / (cv * cv);
    const scale = mean / shape;
    return Math.max(1e-4, randomGamma(shape, scale));
  }

  createCustomerElement(customer) {
    let element = this.customerElements.get(customer.id);
    if (element) return element;
    this.refreshLayout();
    element = document.createElement("div");
    element.className = "customer";
    element.textContent = customer.id;
    const spawn = this.getEntryPosition();
    const jitterX = Math.random() * 12 - 6;
    const jitterY = Math.random() * 10 - 5;
    this.setElementPosition(element, { x: spawn.x + jitterX, y: spawn.y + jitterY }, true);
    this.layer.appendChild(element);
    requestAnimationFrame(() => element.classList.add("visible"));
    this.customerElements.set(customer.id, element);
    return element;
  }

  animateDirectService(customer, serverIndex) {
    const element = this.createCustomerElement(customer);
    const queueFront = this.getQueuePosition(0);
    this.setElementPosition(element, queueFront);
    setTimeout(() => {
      if (this.customerElements.has(customer.id)) this.moveCustomerToServer(customer, serverIndex);
    }, 220);
  }

  moveCustomerToQueue(customer, index, immediate = false) {
    const element = this.createCustomerElement(customer);
    this.setElementPosition(element, this.getQueuePosition(index), immediate);
  }

  moveCustomerToServer(customer, serverIndex, immediate = false) {
    const server = this.servers[serverIndex];
    if (!server || server.customer !== customer) return;
    const element = this.createCustomerElement(customer);
    this.setElementPosition(element, this.getServerPosition(serverIndex), immediate);
  }

  sendCustomerToExit(customerId) {
    const element = this.customerElements.get(customerId);
    if (!element) return;
    this.setElementPosition(element, this.getExitPosition());
    requestAnimationFrame(() => {
      element.style.opacity = "0";
    });
    setTimeout(() => this.removeCustomerElement(customerId), 700);
  }

  rejectCustomer(customer) {
    const element = this.createCustomerElement(customer);
    element.classList.add("rejected");
    const entry = this.getEntryPosition();
    this.setElementPosition(element, { x: entry.x + 28, y: entry.y - 52 });
    requestAnimationFrame(() => {
      element.style.opacity = "0";
    });
    setTimeout(() => this.removeCustomerElement(customer.id), 520);
  }

  removeCustomerElement(customerId) {
    const element = this.customerElements.get(customerId);
    if (!element) return;
    element.remove();
    this.customerElements.delete(customerId);
  }

  updateQueuePositions(immediate = false) {
    this.refreshLayout();
    this.queue.forEach((customer, index) => this.moveCustomerToQueue(customer, index, immediate));
  }

  updateAllPositions(immediate = false) {
    this.refreshLayout();
    this.queue.forEach((customer, index) => this.moveCustomerToQueue(customer, index, immediate));
    this.servers.forEach((server, index) => {
      if (server.busy && server.customer) this.moveCustomerToServer(server.customer, index, immediate);
    });
  }

  getEntryPosition() {
    return {
      x: this.entryRect.left - this.canvasRect.left - this.customerSize * 1.4,
      y: this.entryRect.top - this.canvasRect.top + this.entryRect.height / 2 - this.customerSize / 2,
    };
  }

  getQueuePosition(index) {
    const padding = 12;
    const availableWidth = Math.max(this.queueRect.width - padding * 2, this.queueSpacing);
    const perRow = Math.max(Math.floor(availableWidth / this.queueSpacing), 1);
    const col = index % perRow;
    const row = Math.floor(index / perRow);
    const startX = this.queueRect.left - this.canvasRect.left + this.queueRect.width - padding - this.customerSize;
    const minX = this.queueRect.left - this.canvasRect.left + padding;
    return {
      x: Math.max(minX, startX - col * this.queueSpacing),
      y: this.queueRect.top - this.canvasRect.top + padding + row * this.queueRowHeight,
    };
  }

  getServerPosition(index) {
    const rect = this.serverRects[index];
    return {
      x: rect.left - this.canvasRect.left + rect.width / 2 - this.customerSize / 2,
      y: rect.top - this.canvasRect.top + rect.height / 2 - this.customerSize / 2,
    };
  }

  getExitPosition() {
    return {
      x: this.exitRect.left - this.canvasRect.left + this.exitRect.width + 36,
      y: this.exitRect.top - this.canvasRect.top + this.exitRect.height / 2 - this.customerSize / 2,
    };
  }

  setElementPosition(element, position, immediate = false) {
    if (immediate) {
      element.style.transition = "none";
      element.style.transform = `translate3d(${position.x}px, ${position.y}px, 0)`;
      element.offsetHeight;
      element.style.transition = "";
      return;
    }
    element.style.transform = `translate3d(${position.x}px, ${position.y}px, 0)`;
  }

  recordHistory() {
    this.history.push({
      t: this.simTime,
      queue: this.queue.length,
      system: this.systemCount,
      drop: this.systemCount >= this.config.capacity ? 1 : 0,
    });
    if (this.history.length > 240) this.history.shift();
  }

  renderHistory() {
    const svg = this.elements.historyChart;
    if (!svg) return;
    const width = 800;
    const height = 220;
    const padding = 16;
    const data = this.history;
    if (!data.length) {
      svg.innerHTML = "";
      return;
    }
    const maxY = Math.max(this.config.capacity, ...data.map((point) => point.system), 1);
    const x = (index) => padding + (index / Math.max(data.length - 1, 1)) * (width - padding * 2);
    const y = (value) => height - padding - (value / maxY) * (height - padding * 2);
    const line = (key) => data.map((point, index) => `${index === 0 ? "M" : "L"}${x(index)},${y(point[key])}`).join(" ");
    const dropSegments = data
      .filter((point) => point.drop)
      .map((point, index) => `<circle cx="${x(data.indexOf(point))}" cy="${y(0.3)}" r="3.5" fill="#dc2626"></circle>`)
      .join("");
    svg.innerHTML = `
      <path d="${line("system")}" fill="none" stroke="#2563eb" stroke-width="2.5"></path>
      <path d="${line("queue")}" fill="none" stroke="#0f766e" stroke-width="2.5"></path>
      ${dropSegments}
    `;
  }

  renderServers() {
    this.servers.forEach((server, index) => {
      this.elements.serverPanels[index].classList.toggle("busy", server.busy);
    });
  }

  renderStats() {
    const measuredSeconds = Math.max(this.metrics.measuredDuration, 1e-9);
    const throughput = this.metrics.served / measuredSeconds;
    const avgWait = this.metrics.served > 0 ? this.metrics.waitTimeSum / this.metrics.served : 0;
    const avgSystem = this.metrics.served > 0 ? this.metrics.systemTimeSum / this.metrics.served : 0;
    const util1 = (this.servers[0].busyTimeMeasured / measuredSeconds) * 100;
    const util2 = (this.servers[1].busyTimeMeasured / measuredSeconds) * 100;
    const avgQueueLen = this.metrics.queueArea / measuredSeconds;
    const avgSystemLen = this.metrics.systemArea / measuredSeconds;
    const dropRate = this.metrics.arrivals > 0 ? (this.metrics.dropped / this.metrics.arrivals) * 100 : 0;
    const rho = (this.config.arrivalRate * this.config.meanService) / this.config.servers;
    const distributionLabels = {
      gamma: `Gamma (CV ${formatNumber(this.config.serviceCv, 1)})`,
      exponential: "Exponential",
      deterministic: "Deterministic",
    };

    this.elements.simTime.textContent = `${formatNumber(this.simTime, 1)}s`;
    this.elements.simPhase.textContent = this.measurementCompleted ? "Done" : this.measurementStarted ? "Measurement" : "Warm-up";
    this.elements.measuredTime.textContent = `${formatNumber(this.metrics.measuredDuration, 1)}s`;
    this.elements.inSystem.textContent = String(this.systemCount);
    this.elements.inQueue.textContent = String(this.queue.length);
    this.elements.busyServers.textContent = String(this.busyServerCount());
    this.elements.arrivals.textContent = String(this.metrics.arrivals);
    this.elements.served.textContent = String(this.metrics.served);
    this.elements.dropped.textContent = String(this.metrics.dropped);
    this.elements.throughput.textContent = `${formatNumber(throughput, 2)}/s`;
    this.elements.avgWait.textContent = `${formatNumber(avgWait, 2)}s`;
    this.elements.avgSystem.textContent = `${formatNumber(avgSystem, 2)}s`;
    this.elements.util1.textContent = `${formatNumber(util1, 1)}%`;
    this.elements.util2.textContent = `${formatNumber(util2, 1)}%`;
    this.elements.avgQueueLen.textContent = formatNumber(avgQueueLen);
    this.elements.avgSystemLen.textContent = formatNumber(avgSystemLen);
    this.elements.dropRate.textContent = `${formatNumber(dropRate, 1)}%`;
    this.elements.rho.textContent = formatNumber(rho);
    this.elements.distributionLabel.textContent = distributionLabels[this.config.serviceDistribution];
    this.renderHistory();
  }

  render() {
    this.renderServers();
    this.renderStats();
  }
}

const simulation = new QueueSimulation();

const arrivalRateInput = document.getElementById("arrivalRate");
const meanServiceInput = document.getElementById("meanService");
const serviceDistributionInput = document.getElementById("serviceDistribution");
const serviceCvInput = document.getElementById("serviceCv");
const capacityInput = document.getElementById("capacity");
const warmupTimeInput = document.getElementById("warmupTime");
const measurementTimeInput = document.getElementById("measurementTime");
const speedInput = document.getElementById("speed");
const cvValue = document.getElementById("cvValue");
const speedValue = document.getElementById("speedValue");
const startBtn = document.getElementById("startBtn");
const pauseBtn = document.getElementById("pauseBtn");
const resetBtn = document.getElementById("resetBtn");

function syncDistributionUi() {
  const isGamma = serviceDistributionInput.value === "gamma";
  serviceCvInput.disabled = !isGamma;
  cvValue.textContent = isGamma ? Number(serviceCvInput.value).toFixed(1) : "n/a";
}

function applyFormConfig() {
  const arrivalRate = clampNumber(arrivalRateInput.value, 0.05, 8, 1.2);
  const meanService = clampNumber(meanServiceInput.value, 0.05, 5, 0.7);
  const capacity = Math.round(clampNumber(capacityInput.value, 2, 60, 10));
  const serviceCv = clampNumber(serviceCvInput.value, 0, 2, 0.8);
  const warmupTime = clampNumber(warmupTimeInput.value, 0, 10000, 60);
  const measurementTime = clampNumber(measurementTimeInput.value, 10, 10000, 300);
  const speed = Math.round(clampNumber(speedInput.value, 1, 80, 10));
  arrivalRateInput.value = arrivalRate;
  meanServiceInput.value = meanService;
  capacityInput.value = capacity;
  warmupTimeInput.value = warmupTime;
  measurementTimeInput.value = measurementTime;
  serviceCvInput.value = serviceCv;
  speedInput.value = speed;
  speedValue.textContent = `${speed}×`;
  syncDistributionUi();
  simulation.updateConfig({
    arrivalRate,
    meanService,
    capacity,
    serviceCv,
    serviceDistribution: serviceDistributionInput.value,
    warmupTime,
    measurementTime,
    speed,
  });
}

arrivalRateInput.addEventListener("change", applyFormConfig);
meanServiceInput.addEventListener("change", applyFormConfig);
serviceDistributionInput.addEventListener("change", applyFormConfig);
capacityInput.addEventListener("change", applyFormConfig);
warmupTimeInput.addEventListener("change", applyFormConfig);
measurementTimeInput.addEventListener("change", applyFormConfig);
serviceCvInput.addEventListener("input", syncDistributionUi);
serviceCvInput.addEventListener("change", applyFormConfig);
speedInput.addEventListener("input", () => {
  speedValue.textContent = `${speedInput.value}×`;
  simulation.config.speed = Number(speedInput.value);
});

startBtn.addEventListener("click", () => simulation.start());
pauseBtn.addEventListener("click", () => {
  if (simulation.running) {
    simulation.pause();
    pauseBtn.textContent = "Resume";
  } else {
    simulation.start();
    pauseBtn.textContent = "Pause";
  }
});
resetBtn.addEventListener("click", () => {
  simulation.pause();
  simulation.reset();
  pauseBtn.textContent = "Pause";
});

document.addEventListener("visibilitychange", () => {
  if (document.hidden && simulation.running) {
    simulation.pause();
    pauseBtn.textContent = "Resume";
    simulation._pausedByVisibility = true;
  } else if (!document.hidden && simulation._pausedByVisibility) {
    simulation._pausedByVisibility = false;
    simulation.start();
    pauseBtn.textContent = "Pause";
  }
});

document.addEventListener("keydown", (event) => {
  const tagName = event.target?.tagName;
  if (tagName === "INPUT" || tagName === "SELECT") return;
  if (event.code !== "Space") return;
  event.preventDefault();
  if (simulation.running) {
    simulation.pause();
    pauseBtn.textContent = "Resume";
  } else {
    simulation.start();
    pauseBtn.textContent = "Pause";
  }
});

applyFormConfig();
