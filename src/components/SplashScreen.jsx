import React, { useEffect, useState, useRef } from 'react';

const SplashScreen = ({ onFinish }) => {
  const [fadeOut, setFadeOut] = useState(false);
  const videoRef = useRef(null);

  useEffect(() => {
    const video = videoRef.current;
    
    const handleVideoEnd = () => {
      setFadeOut(true);
      setTimeout(onFinish, 500);
    };

    const handleVideoLoad = () => {
      // Video cargado, listo para reproducir
    };

    if (video) {
      video.addEventListener('ended', handleVideoEnd);
      video.addEventListener('loadeddata', handleVideoLoad);
      
      // Reproducir el video automáticamente
      video.play().catch(error => {
        console.log('Error al reproducir video:', error);
        // Si no se puede reproducir automáticamente, terminar después de 3 segundos
        setTimeout(() => {
          setFadeOut(true);
          setTimeout(onFinish, 500);
        }, 3000);
      });
    }

    return () => {
      if (video) {
        video.removeEventListener('ended', handleVideoEnd);
        video.removeEventListener('loadeddata', handleVideoLoad);
      }
    };
  }, [onFinish]);

  return (
    <div className={`fixed inset-0 flex items-center justify-center transition-all duration-500 z-50 bg-black ${
      fadeOut ? 'opacity-0 pointer-events-none' : 'opacity-100'
    }`}>
      {/* Video de introducción */}
      <video
        ref={videoRef}
        className="w-full h-full object-cover"
        muted
        playsInline
        preload="auto"
      >
        <source src="/assets/video/intro.mp4" type="video/mp4" />
        Tu navegador no soporta la reproducción de video.
      </video>
    </div>
  );
}; 

export default SplashScreen;