import React from 'react';
import './PipelineSignature.css';

export const PIPELINE_STAGES = ['Detected', 'Understanding', 'Deciding', 'Policy Check', 'Verifying', 'Executing', 'Outcome'];

const PipelineSignature = ({ activeStage = -1, compact = false, className = '' }) => (
  <div className={`pipeline-signature ${compact ? 'pipeline-signature--compact' : ''} ${className}`} aria-label="Revenue recovery pipeline">
    {PIPELINE_STAGES.map((stage, index) => (
      <React.Fragment key={stage}>
        <div className={`pipeline-stage ${index < activeStage ? 'is-complete' : ''} ${index === activeStage ? 'is-active' : ''}`}>
          <span className="pipeline-stage-dot">{index + 1}</span>
          {!compact && <span className="pipeline-stage-label">{stage}</span>}
        </div>
        {index < PIPELINE_STAGES.length - 1 && <span className={`pipeline-connector ${index < activeStage ? 'is-complete' : ''}`} />}
      </React.Fragment>
    ))}
  </div>
);

export default PipelineSignature;
