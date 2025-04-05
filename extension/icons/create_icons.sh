#!/bin/bash

# This script creates placeholder SVG icons for the extension
# Note: You would replace these with actual icons for production

# Create 16x16 icon
cat > icon16.svg << EOF
<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16">
  <rect width="16" height="16" fill="#0ea5e9" rx="3" />
  <text x="8" y="12" font-family="Arial" font-size="10" fill="white" text-anchor="middle">LR</text>
</svg>
EOF

# Create 48x48 icon
cat > icon48.svg << EOF
<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 48 48">
  <rect width="48" height="48" fill="#0ea5e9" rx="8" />
  <text x="24" y="32" font-family="Arial" font-size="24" fill="white" text-anchor="middle">LR</text>
</svg>
EOF

# Create 128x128 icon
cat > icon128.svg << EOF
<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="0 0 128 128">
  <rect width="128" height="128" fill="#0ea5e9" rx="16" />
  <text x="64" y="80" font-family="Arial" font-size="64" fill="white" text-anchor="middle">LR</text>
</svg>
EOF

# Convert SVG to PNG using browser or another tool
# For a real extension, use proper icons
echo "SVG icons created. Please convert them to PNG format."
echo "For a production extension, replace with proper icons." 