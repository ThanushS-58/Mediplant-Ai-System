import React from 'react';

export const ChatBubbleIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg
    {...props}
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
    strokeWidth={1.5}
    stroke="currentColor"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M20.25 8.511c.884.284 1.5 1.128 1.5 2.097v4.286c0 1.136-.847 2.1-1.98 2.193l-3.723.372c-1.09.11-2.16-.324-2.888-1.116l-2.625-3.333c-.727-.923-1.797-1.46-2.888-1.46l-3.723 0c-1.133 0-1.98-.965-1.98-2.193v-4.286c0-.97.616-1.813 1.5-2.097L6.75 6.25m11.25 0l-3.723-.372M6.75 6.25L3 7.5m1.5-1.5l-1.5-1.5m13.5 0l-1.5-1.5m1.5 1.5l-1.5 1.5"
    />
  </svg>
);