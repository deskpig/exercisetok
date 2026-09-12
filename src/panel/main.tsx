import React from 'react';
import { createRoot } from 'react-dom/client';
import { WorkflowApp } from '../shared/WorkflowApp';
import '../shared/styles.css';
createRoot(document.getElementById('root')!).render(<React.StrictMode><WorkflowApp /></React.StrictMode>);
