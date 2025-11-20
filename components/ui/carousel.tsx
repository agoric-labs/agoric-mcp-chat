'use client';

import { useState, useEffect, useRef } from 'react';

const VerticalTextCarousel = () => {
  // Sample texts to display in the carousel
  const texts = [
    "What's the latest proposal from the Economic Committee?",
    "What's the balance of this Agoric address: agoric1...",
    'Show me all the YMax portfolio positions',
    'Can you explain what happened in this transaction: 1A2B3C...',
  ];

  const itemHeight = 40;

  const [activeIndex, setActiveIndex] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const containerRef = useRef(null);

  // Function to handle automatic rotation
  useEffect(() => {
    const interval = setInterval(() => {
      if (!isAnimating) {
        nextSlide();
      }
    }, 3000); // Rotate every 3 seconds

    return () => clearInterval(interval);
  }, [isAnimating]);

  const nextSlide = () => {
    setIsAnimating(true);
    setActiveIndex(prevIndex => (prevIndex + 1) % texts.length);
    setTimeout(() => setIsAnimating(false), 700); // Match this with the transition duration
  };

  const prevSlide = () => {
    setIsAnimating(true);
    setActiveIndex(prevIndex =>
      prevIndex === 0 ? texts.length - 1 : prevIndex - 1,
    );
    setTimeout(() => setIsAnimating(false), 700); // Match this with the transition duration
  };

  // Calculate transform value based on active index
  const getTransformValue = () => {
    return `translateY(-${itemHeight * activeIndex}px)`;
  };

  return (
    <div className="hidden sm:flex flex-col justify-center w-full mx-auto px-4 sm:px-6 md:py-4">
      <div className="relative h-32 overflow-hidden">
        {/* This is the transitioning container */}
        <div
          ref={containerRef}
          className="absolute inset-0 transition-transform duration-700 ease-in-out"
          style={{ transform: getTransformValue() }}
        >
          {texts.map((text, index) => {
            // Each text item is positioned relative to its index
            return (
              <div
                key={index}
                className="absolute w-full h-16 flex items-center justify-center"
                style={{ top: `${index * itemHeight}px` }}
              >
                <div
                  className={`w-full p-4 rounded-lg transition-all duration-500
                      ${
                        activeIndex === index
                          ? ' text-foreground/90 font-medium scale-100 opacity-100'
                          : Math.abs(activeIndex - index) === 1 ||
                              (activeIndex === 0 &&
                                index === texts.length - 1) ||
                              (activeIndex === texts.length - 1 && index === 0)
                            ? 'text-gray-500 scale-95 opacity-60'
                            : 'opacity-0'
                      }`}
                >
                  <p className="text-center">{text}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default VerticalTextCarousel;
