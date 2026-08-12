import { Queue } from "bullmq";

import { createQueueConnection } from "@/lib/queue/connection";

export const FILE_PROCESSING_QUEUE = "file-processing";

export interface FileProcessingJobData {
  workspaceId: string;
  fileId: string;
  storagePath: string;
  fileType: "PDF" | "TXT" | "MANUAL";
  fileName: string;
}

let queueInstance: Queue<FileProcessingJobData> | null = null;

function getQueue() {
  if (!queueInstance) {
    queueInstance = new Queue<FileProcessingJobData>(FILE_PROCESSING_QUEUE, {
      connection: createQueueConnection(),
      defaultJobOptions: {
        attempts: 3,
        backoff: { type: "exponential", delay: 5000 },
        removeOnComplete: { count: 200 },
        removeOnFail: { count: 500 },
      },
    });
  }
  return queueInstance;
}

/**
 * Scale path: swap the inline `await processKnowledgeFile(...)` call in
 * the upload/manual/reprocess routes for `await enqueueFileProcessing(...)`
 * and run `npm run worker` as a separate process. Nothing else changes —
 * same job data shape, same processKnowledgeFile function on the other end.
 */
export async function enqueueFileProcessing(data: FileProcessingJobData) {
  return getQueue().add("process", data);
}
