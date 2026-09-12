import React from 'react';
import { createRoot } from 'react-dom/client';
import { WorkflowApp } from '../shared/WorkflowApp';
import { ReviewWorkspace } from '../shared/ReviewWorkspace';
import '../shared/styles.css';
const sessionId = new URLSearchParams(location.search).get('session');
createRoot(document.getElementById('root')!).render(<React.StrictMode>{sessionId ? <ReviewWorkspace sessionId={sessionId} /> : <WorkflowApp />}</React.StrictMode>);
