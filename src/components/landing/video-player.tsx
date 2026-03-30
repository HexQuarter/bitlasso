import { createPlayer, FullscreenButton, videoFeatures } from '@videojs/react';
import { Video } from '@videojs/react/video';
import { Fullscreen } from 'lucide-react';
import { Button } from '../ui/button';
import { BiExitFullscreen } from 'react-icons/bi';

const Player = createPlayer({ features: videoFeatures });

interface MyPlayerProps {
    src: string;
}

export const MyPlayer = ({ src }: MyPlayerProps) => {
    return (
        <Player.Provider>
            <Player.Container className='justify-center flex items-center relative'>
                <Video src={src} muted={true} playsInline autoPlay={true} loop={true} className='rounded-2xl shadow-lg h-full items-center justify-center relative' />
                <FullscreenButton
                    className="absolute p-2! h-8 w-8 data-[fullscreen]:bottom-2 data-[fullscreen]:right-2  right-2 bottom-2"
                    render={(props, state) =>
                        <Button {...props}>{state.fullscreen ? <BiExitFullscreen /> : <Fullscreen />}</Button>
                    }
                />
            </Player.Container>
        </Player.Provider>
    );
};
