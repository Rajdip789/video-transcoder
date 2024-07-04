const express = require('express');
const app = express();
const cors = require("cors");
require("dotenv").config();

const corsOption = {
	origin: [process.env.CROSS_ORIGIN_URL],
	methods: ['GET', 'PUT', 'POST', 'DELETE', 'OPTIONS'],
	credentials: true,
	optionsSuccessStatus: 200,
};

app.use(express.json());
app.use(cors(corsOption));

const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');

const s3Client = new S3Client({
	region: "ap-south-1",
	credentials: {
		accessKeyId: process.env.ACCESS_KEY_ID,
		secretAccessKey: process.env.SECRET_ACCESS_KEY,
	}
});

const putObjectUrl = async (filename, videoType) => {
	try {
		const command = new PutObjectCommand({
			Bucket: 'rajdip.videotranscoder',
			Key: `uploads/${filename}-${Date.now()}.${videoType}`,
			ContentType: "video"
		})
	
		const url = await getSignedUrl(s3Client, command, { expiresIn: 300 });
	
		return url;	
	} catch (error) {
		console.error('Error generating presigned URL:', error);
    	return null;
	}
}

app.post('/url', async (req, res) => {
	try {
		
		const { filename, videoType } = req.body;
		
		const url = await putObjectUrl(filename, videoType.split('/')[1]);

		return res.status(201).send({ success : true, message: "Signed url get", signedUrl: url });	

	} catch (error) {
		return res.status(500).send({ success: false, message: "Error while generating url" });
	}
})

app.listen(5000, () => {
	console.log('Server is running on port 5000');
})