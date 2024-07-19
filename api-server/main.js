const cors = require("cors");
const express = require('express');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const { ECSClient, RunTaskCommand } = require('@aws-sdk/client-ecs');
const { SQSClient, ReceiveMessageCommand, DeleteMessageCommand } = require('@aws-sdk/client-sqs');
require("dotenv").config();

const corsOption = {
	origin: [process.env.CROSS_ORIGIN_URL],
	methods: ['GET', 'PUT', 'POST', 'DELETE', 'OPTIONS'],
	credentials: true,
	optionsSuccessStatus: 200,
};

const app = express();
app.use(express.json());
app.use(cors(corsOption));

const config = {
	region: "ap-south-1",
	credentials: {
		accessKeyId: process.env.ACCESS_KEY_ID,
		secretAccessKey: process.env.SECRET_ACCESS_KEY,
	}
};
const s3Client = new S3Client(config);
const sqsClient = new SQSClient(config);
const ecsClient = new ECSClient(config);

const putObjectUrl = async (filename, videoType) => {
	try {
		const command = new PutObjectCommand({
			Bucket: 'rajdip.videotranscoder',
			Key: `uploads/${filename.split('.')[0]}-${Date.now()}.${videoType}`,
			ContentType: "video"
		})
	
		const url = await getSignedUrl(s3Client, command, { expiresIn: 300 });
	
		return url;	
	} catch (error) {
		console.error('Error generating presigned URL:', error);
    	return null;
	}
}

const runECSTask = async (obj) => {
	try {
		const command = new RunTaskCommand({
			cluster: config.CLUSTER,
			taskDefinition: config.TASK,
			launchType: 'FARGATE',
			count: 1,
			networkConfiguration: {
				awsvpcConfiguration: {
					assignPublicIp: 'ENABLED',
					subnets: ['', '', ''],
					securityGroups: ['']
				}
			},
			overrides: {
				containerOverrides: [
					{
						name: 'vidoe-transcoder-image',
						environment: [
							{ name: 'BUCKET_NAME', value: obj.bucket.name },
							{ name: 'KEY', value: obj.object.key }
						]
					}
				]
			}
		})
	
		await ecsClient.send(command);
		
	} catch (error) {
		console.log(error);
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

const pollSQS = async () => {
	try {
		const data = await sqsClient.send(new ReceiveMessageCommand({	
			QueueUrl: process.env.QUEUE_URL,
			WaitTimeSeconds: 20,
		}));
	
		const body = JSON.parse(data?.Messages[0]?.Body);

		if(body.Records) {
			console.log(body.Records[0].s3);
			//await runECSTask(body.Records[0].s3);
		}
		

	} catch (error) {
		console.log(error);
	}
}

const main = async () => {
	while(true) {
		await pollSQS();
	}
}

main();

app.listen(5000, () => {
	console.log('Server is running on port 5000');
})