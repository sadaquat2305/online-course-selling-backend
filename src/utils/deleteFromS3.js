import { S3Client, DeleteObjectCommand } from "@aws-sdk/client-s3";

// Configure AWS S3 Client (SDK v3)
const s3 = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

// Delete File from S3
const deleteFromS3 = async (fileKey) => {
  try {
    if (!fileKey) {
      console.error("File key is missing");
      return;
    }

    const params = {
      Bucket: process.env.AWS_S3_BUCKET, // Ensure this is correctly set in .env
      Key: fileKey,
    };

    const command = new DeleteObjectCommand(params);
    await s3.send(command);
    console.log(`Deleted from S3: ${fileKey}`);
  } catch (error) {
    console.error("S3 Deletion Error:", error);
    throw new Error("Failed to delete file from S3");
  }
};

export { deleteFromS3 };
