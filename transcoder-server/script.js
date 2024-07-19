const fs = require('fs');
const path = require('path');
const { promisify } = require('util');
const { pipeline } = require('stream');
const { exec } = require('child_process')
const { S3Client, PutObjectCommand, GetObjectCommand } = require('@aws-sdk/client-s3')
require('dotenv').config();

const bucket = process.env.BUCKET_NAME;
const bucketToUpload = process.env.BUCKET_NAME_P;
const inputKey = process.env.KEY;
const outputKey = `outputs/${inputKey.split('.')[0].split('/')[1]}-${Date.now()}`;
const inputPath = '/home/app/videos/input.mp4';
const outputPath = '/home/app/segments';
const s3Client = new S3Client({
	region: "ap-south-1",
	credentials: {
		accessKeyId: process.env.ACCESS_KEY_ID,
		secretAccessKey: process.env.SECRET_ACCESS_KEY,
	}
});

const downloadFromS3 = async (bucket, key, downloadPath) => {
	const pipelinePromise = promisify(pipeline);

	const command = new GetObjectCommand({ Bucket: bucket, Key: key });
	const response = await s3Client.send(command);

	return pipelinePromise(response.Body, fs.createWriteStream(downloadPath));
};

const uploadToS3 = async (bucket, key, fileContent) => {
	const command = new PutObjectCommand({
		Bucket: bucket,
		Key: key,
		Body: fileContent,
	});

	await s3Client.send(command);
}
const uploadSegmentsToS3 = async (bucket, key, dirPath) => {
	const files = fs.readdirSync(dirPath);

	for (const file of files) {
		const filePath = path.join(dirPath, file);
		const fileContent = fs.readFileSync(filePath);
		const s3Key = `${key}/${file}`;
		await uploadToS3(bucket, s3Key, fileContent);
	}
};

const transcodeVideo = (inputPath, outputPath) => {
	return new Promise((resolve, reject) => {
		const command = `ffmpeg -i ${inputPath} -codec:v libx264 -codec:a aac -hls_time 10 -hls_playlist_type vod -hls_segment_filename ${outputPath}/segment%03d.ts -start_number 0 index.m3u8`;

		exec(command, (error, stdout, stderr) => {
			if (error) {
				reject(error);
				return;
			}
			if (stderr) {
				console.error(`stderr: ${stderr}`);
			}
			resolve(stdout);
		});
	});
};

async function init() {
	try {
		console.log('Executing script.js')

		await downloadFromS3(bucket, inputKey, inputPath);
	
		await transcodeVideo(inputPath, outputPath);
	
		await uploadSegmentsToS3(bucketToUpload, outputKey, outputPath);
	
		console.log('Done...')	
	} catch (error) {
		console.log(error);
	}
}

init();