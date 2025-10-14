import React, { useState } from 'react';
import { ChatBubbleIcon } from './Icons';

interface FeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (feedback: string) => void;
}

const FeedbackModal: React.FC<FeedbackModalProps> = ({ isOpen, onClose, onSubmit }) => {
  const [feedback, setFeedback] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) {
    return null;
  }

  const handleSubmit = () => {
    if (!feedback.trim()) {
      return; // Prevent submitting empty feedback
    }
    setIsSubmitting(true);
    // Simulate an API call latency
    setTimeout(() => {
      onSubmit(feedback);
      setFeedback(''); // Reset field after submission
      setIsSubmitting(false);
    }, 500);
  };

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-60 flex justify-center items-center z-50 transition-opacity"
      onClick={handleBackdropClick}
    >
      <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-lg mx-4 transform transition-all">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-slate-800 flex items-center">
            <ChatBubbleIcon className="w-6 h-6 mr-2 text-brand-primary" />
            Provide Feedback
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-2xl leading-none">&times;</button>
        </div>
        <p className="text-sm text-slate-600 mb-4">
          We value your input! Let us know what you think or if you've found an issue. Your feedback helps us improve.
        </p>
        <textarea
          value={feedback}
          onChange={(e) => setFeedback(e.target.value)}
          className="w-full h-40 p-3 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-primary disabled:bg-slate-100"
          placeholder="Your feedback here..."
          disabled={isSubmitting}
        />
        <div className="flex justify-end mt-4">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 rounded-md hover:bg-slate-200 mr-2 disabled:opacity-50"
            disabled={isSubmitting}
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            className="px-6 py-2 text-sm font-medium text-white bg-brand-primary rounded-md hover:bg-brand-dark disabled:bg-slate-400 disabled:cursor-not-allowed"
            disabled={!feedback.trim() || isSubmitting}
          >
            {isSubmitting ? 'Submitting...' : 'Submit'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default FeedbackModal;