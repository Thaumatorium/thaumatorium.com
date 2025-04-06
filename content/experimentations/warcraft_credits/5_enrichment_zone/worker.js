// worker.js (Simplified)
import { fetchJsonFile } from './dataUtils.js'; // Workers can import modules
import { processGraphData } from './graphProcessor.js';

self.onmessage = async (event) => {
    const { filename1, filename2 } = event.data;
    console.log(`Worker received job for: ${filename1}, ${filename2}`);
    try {
        const isSameGame = (filename1 === filename2);
        let data1, data2;
        // Let worker handle fetching too
        if (isSameGame) {
            data1 = await fetchJsonFile(filename1); // fetchJsonFile needs to work in worker context
            data2 = data1;
        } else {
            [data1, data2] = await Promise.all([
                fetchJsonFile(filename1),
                fetchJsonFile(filename2)
            ]);
        }

        // Create a dedicated Map instance inside the worker for roles
        const workerPersonRolesMap = new Map();
        const graphDataForVis = processGraphData(data1, data2, isSameGame, workerPersonRolesMap);

        // Post processed graph data AND the roles map back
        self.postMessage({
             status: 'success',
             graphData: graphDataForVis,
             personRolesMapData: Array.from(workerPersonRolesMap.entries()) // Convert Map to array for posting
             });

    } catch (error) {
        console.error("Worker error:", error);
        self.postMessage({ status: 'error', message: error.message });
    }
};
