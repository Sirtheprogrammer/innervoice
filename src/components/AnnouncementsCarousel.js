import React, { useState, useEffect, useRef } from 'react';
import { getAnnouncements } from '../services/announcementService';
import '../App.css';

export default function AnnouncementsCarousel() {
  const [announcements, setAnnouncements] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isPaused, setIsPaused] = useState(false);
  const [showButtons, setShowButtons] = useState(false);
  const carouselRef = useRef(null);
  const buttonHideTimeoutRef = useRef(null);

  // Fetch announcements from Firestore
  useEffect(() => {
    const fetchAnnouncements = async () => {
      setLoading(true);
      setError('');
      try {
        const data = await getAnnouncements();
        if (data && data.length > 0) {
          setAnnouncements(data);
        } else {
          // No announcements yet, use placeholder
          setAnnouncements([
            {
              id: 'placeholder',
              title: 'No announcements yet',
              image: 'https://via.placeholder.com/600x300/C1121F/ffffff?text=No+Announcements',
            },
          ]);
        }
      } catch (err) {
        console.error('Error fetching announcements:', err);
        setError('Failed to load announcements');
        // Show placeholder on error
        setAnnouncements([
          {
            id: 'error',
            title: 'Unable to load announcements',
            image: 'https://via.placeholder.com/600x300/9b0f18/ffffff?text=Error',
          },
        ]);
      } finally {
        setLoading(false);
      }
    };

    fetchAnnouncements();
  }, []);

  // Auto-toggle every 6 seconds (unless paused)
  useEffect(() => {
    if (announcements.length === 0 || isPaused) return;

    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % announcements.length);
    }, 6000);

    return () => clearInterval(interval);
  }, [announcements.length, isPaused]);

  const handlePrevious = () => {
    setCurrentIndex((prev) => (prev - 1 + announcements.length) % announcements.length);
    // Pause and show buttons briefly
    setIsPaused(true);
    resetButtonDisplay();
  };

  const handleNext = () => {
    setCurrentIndex((prev) => (prev + 1) % announcements.length);
    // Pause and show buttons briefly
    setIsPaused(true);
    resetButtonDisplay();
  };

  const handleDotClick = (index) => {
    setCurrentIndex(index);
    setIsPaused(true);
    resetButtonDisplay();
  };

  const resetButtonDisplay = () => {
    setShowButtons(true);
    if (buttonHideTimeoutRef.current) {
      clearTimeout(buttonHideTimeoutRef.current);
    }
    // Auto-hide buttons after 3 seconds and resume auto-rotation
    buttonHideTimeoutRef.current = setTimeout(() => {
      setShowButtons(false);
      setIsPaused(false);
    }, 3000);
  };

  const handleMouseEnter = () => {
    setShowButtons(true);
    if (buttonHideTimeoutRef.current) {
      clearTimeout(buttonHideTimeoutRef.current);
    }
  };

  const handleMouseLeave = () => {
    if (buttonHideTimeoutRef.current) {
      clearTimeout(buttonHideTimeoutRef.current);
    }
    buttonHideTimeoutRef.current = setTimeout(() => {
      setShowButtons(false);
      setIsPaused(false);
    }, 2000);
  };

  const handleTouchStart = () => {
    setIsPaused(true);
    setShowButtons(true);
    if (buttonHideTimeoutRef.current) {
      clearTimeout(buttonHideTimeoutRef.current);
    }
  };

  const handleTouchEnd = () => {
    // Resume auto-rotation after 2 seconds of no touch
    if (buttonHideTimeoutRef.current) {
      clearTimeout(buttonHideTimeoutRef.current);
    }
    buttonHideTimeoutRef.current = setTimeout(() => {
      setShowButtons(false);
      setIsPaused(false);
    }, 2000);
  };

  // Handle loading state
  if (loading) {
    return (
      <div className="announcements-container">
        <div className="carousel">
          <div className="carousel-slide">
            <div className="carousel-loading">Loading announcements...</div>
          </div>
        </div>
      </div>
    );
  }

  // Handle error state
  if (error && announcements.length <= 1) {
    return (
      <div className="announcements-container">
        <div className="carousel">
          <div className="carousel-slide">
            <div className="carousel-error">{error}</div>
          </div>
        </div>
      </div>
    );
  }

  const current = announcements[currentIndex];

  return (
    <div className="announcements-container">
      <div
        className="carousel"
        ref={carouselRef}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        <div className="carousel-slide">
          <img
            src={current.image}
            alt={current.title}
            className="carousel-image"
            onError={(e) => {
              e.target.src = 'https://via.placeholder.com/600x300/C1121F/ffffff?text=Image+Error';
            }}
          />
          <div className="carousel-title">{current.title}</div>

          {/* Navigation Buttons */}
          {announcements.length > 1 && (
            <>
              <button
                className={`carousel-nav prev-btn ${showButtons ? 'visible' : ''}`}
                onClick={handlePrevious}
                aria-label="Previous announcement"
              >
                &#10094;
              </button>
              <button
                className={`carousel-nav next-btn ${showButtons ? 'visible' : ''}`}
                onClick={handleNext}
                aria-label="Next announcement"
              >
                &#10095;
              </button>
            </>
          )}
        </div>
      </div>

      {/* Red dot indicators - only show if more than 1 announcement */}
      {announcements.length > 1 && (
        <div className="carousel-indicators">
          {announcements.map((_, index) => (
            <button
              key={index}
              className={`dot ${index === currentIndex ? 'active' : ''}`}
              onClick={() => handleDotClick(index)}
              aria-label={`Go to announcement ${index + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
