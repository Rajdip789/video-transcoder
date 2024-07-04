import './globals.css'
import axios from 'axios';
import videojs from 'video.js';
import Player from 'video.js/dist/types/player';

import { useCallback, useRef } from 'react'

import VideoPlayer from './VideoPlayer'
import { Button } from './components/ui/button';
import { UploadIcon } from '@radix-ui/react-icons';


function App() {
	const playerRef = useRef<Player | null>(null)
	const videoLink = ""

	const videoPlayerOptions = {
		controls: true,
		responsive: true,
		fluid: true,
		autoplay: false,
		sources: [
			{ src: videoLink, type: "application/x-mpegURL" }
		]
	}
	const handlePlayerReady = (player: Player) => {
		playerRef.current = player;

		// You can handle player events here, for example:
		player.on("waiting", () => {
			videojs.log("player is waiting");
		});

		player.on("dispose", () => {
			videojs.log("player will dispose");
		});
	};

	const handleInputChange = useCallback((input: HTMLInputElement) => {
		return async (event: Event) => {
			try {
				event.preventDefault();
				console.log(input.files);

				const file: File | null | undefined = input.files?.item(0);
				if (!file) return;

				const data = await axios.post('http://localhost:5000/url', {
					filename: file.name,
					videoType: file.type
				}, {
					headers: { 'Content-Type': 'application/json' }
				})

				const signedURLforUpload: string = data.data?.signedUrl;

				if (signedURLforUpload) {
					await axios.put(signedURLforUpload, file, {
						headers: { 'Content-Type': file.type }
					})
				}
			} catch (error) {
				console.log(error);
			}
		}
	}, []);

	const handleUpload = useCallback(() => {
		const input = document.createElement("input");
		input.setAttribute("type", "file");
		input.setAttribute("accept", "video/*");

		input.addEventListener("change", handleInputChange(input));

		input.click();
	}, [])

	return (
		<div>
			<div className='flex flex-col items-end m-2 p-2'>
				<Button className='' onClick={handleUpload}><UploadIcon className='mr-2' />Upload</Button>
			</div>
		</div>
		// <VideoPlayer
		// 	options={videoPlayerOptions}
		// 	onReady={handlePlayerReady}
		// />
	)
}

export default App