import { S3Client, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import fs from "fs";

// Configure AWS S3 Client (SDK v3)
const s3 = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

// Upload File to S3
const uploadOnS3 = async (localFilePath, fileKey , contentType) => {
  try {
    if (!localFilePath) return null;

    // Read file from local path
    const fileContent = fs.readFileSync(localFilePath);

    // Upload to S3 using SDK v3
    const params = {
      Bucket: process.env.AWS_S3_BUCKET,
      Key: fileKey,
      Body: fileContent,
      ACL: "private", // Change to "public-read" if you need public access
      ContentType: contentType,
    };

    const command = new PutObjectCommand(params);
    await s3.send(command);

    // Delete local file after upload
    fs.unlinkSync(localFilePath);

    // Generate a signed URL
    const signedUrl = await getSignedUrl(
      s3,
      new GetObjectCommand({ Bucket: process.env.AWS_S3_BUCKET, Key: fileKey }),
      { expiresIn: 3600 } // URL expires in 1 hour (3600 seconds)
    );

    return {
      success: true,
      message: "File uploaded successfully",
      fileKey: fileKey,
      signedUrl: signedUrl, // Include signed URL in response
    };
  } catch (error) {
    console.error("S3 Upload Error:", error);
    if (fs.existsSync(localFilePath)) fs.unlinkSync(localFilePath);
    return null;
  }
};

export { uploadOnS3 };
