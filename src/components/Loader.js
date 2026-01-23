import React from 'react';
import '../styles/Loader.css';

const Loader = ({ color = '#4f46e5' }) => {
    return (
        <div className="loader-container">
            <div className="bouncing-ball" style={{ backgroundColor: color }}></div>
            <div className="bouncing-ball" style={{ backgroundColor: color }}></div>
            <div className="bouncing-ball" style={{ backgroundColor: color }}></div>
        </div>
    );
};

export default Loader;
