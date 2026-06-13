import React from 'react';
import BubbleHUD from '../BubbleHUD';

const AppLayout = ({ children }) => {
  return (
    <div className="app-layout" style={{ position: 'relative', minHeight: '100vh' }}>
      {children}
      <div style={{ 
        position: 'fixed',
        bottom: '20px',
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 1000
      }}>
        <BubbleHUD />
      </div>
    </div>
  );
};

export default AppLayout;