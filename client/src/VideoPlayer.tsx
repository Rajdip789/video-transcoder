import { useEffect, useRef } from 'react';
import videojs from 'video.js';
import 'video.js/dist/video-js.css';
import Player from 'video.js/dist/types/player';

type VideoPlayerProps = {
	options: {
		controls: boolean;
		responsive: boolean;
		fluid: boolean;
		autoplay: boolean
		sources: {
			src: string;
			type: string;
		}[];
	},
	onReady: (player: Player) => void
}

export const VideoPlayer = (props: VideoPlayerProps) => {
	const videoRef = useRef<HTMLDivElement>(null);
	const playerRef = useRef<Player | null>(null);
	const { options, onReady } = props;

	useEffect(() => {

		if (!playerRef.current && videoRef.current) {
			const videoElement = document.createElement("video-js");

			videoElement.classList.add('vjs-big-play-centered');
			videoRef.current.appendChild(videoElement);

			const player = playerRef.current = videojs(videoElement, options, () => {
				videojs.log('player is ready');
				onReady && onReady(player);
			});

		} else {
			const player = playerRef.current;
			if (player) {
				player.autoplay(options.autoplay);
				player.src(options.sources);
			}
		}
	}, [options, videoRef]);

	// Dispose the Video.js player when the functional component unmounts
	useEffect(() => {
		const player = playerRef.current;

		return () => {
			if (player && !player.isDisposed()) {
				player.dispose();
				playerRef.current = null;
			}
		};
	}, [playerRef]);

	return (
		<div data-vjs-player>
			<div ref={videoRef} />
		</div>
	);
}

export default VideoPlayer;