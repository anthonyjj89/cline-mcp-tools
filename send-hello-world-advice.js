/**
 * Script to send a notification with suggestions for improving the hello world page
 * This will create an advice notification in the external-advice directory for the specified task
 */

import fs from 'fs-extra';
import path from 'path';
import os from 'os';

// Define the specific task ID and path
const homedir = os.homedir();
const taskId = '1742841089770'; // The specific task ID provided by the user
const ultraPath = path.join(homedir, 'Library', 'Application Support', 'Code', 'User', 'globalStorage', 'custom.claude-dev-ultra', 'tasks');
const taskDir = path.join(ultraPath, taskId);
const adviceDir = path.join(taskDir, 'external-advice');

// Create and send the hello world improvement advice
async function sendHelloWorldAdvice() {
  console.log(`Sending hello world improvement advice to task: ${taskId}`);
  
  // Check if the task directory exists
  if (!fs.existsSync(taskDir)) {
    console.error(`Task directory does not exist: ${taskDir}`);
    return false;
  }
  
  // Create the external-advice directory if it doesn't exist
  await fs.mkdirp(adviceDir);
  
  // Create a unique advice ID
  const adviceId = `advice-hello-world-${Date.now()}`;
  
  // Create the advice content with suggestions for improving the hello world page
  const content = `
I noticed your hello world page could use some fun enhancements! Here are some suggestions to make it more engaging:

1. **Add Animation**: Implement a simple CSS animation to make the "Hello World" text bounce, fade in, or have a typing effect.

2. **Interactive Elements**: Add buttons that change the page's background color or text style when clicked.

3. **Emojis and Graphics**: Include relevant emojis (🌍 🚀 👋) or a small SVG illustration to make it visually appealing.

4. **Sound Effects**: Add a subtle sound that plays when the page loads or when elements are interacted with.

5. **Particle Effects**: Implement a simple particle system for a confetti effect when the page loads.

6. **Custom Font**: Use a more playful font from Google Fonts to give the page personality.

7. **Dark/Light Mode Toggle**: Add a simple toggle for users to switch between dark and light themes.

8. **Random Greetings**: Display a random greeting in different languages each time the page loads.

9. **Mini Game**: Add a simple game like "click the button" with a counter or a small maze.

10. **Responsive Design**: Make sure it looks great on all devices with some responsive design tricks.

Would you like me to provide code examples for any of these suggestions?
`;
  
  // Create the advice object
  const advice = {
    id: adviceId,
    content: content,
    title: "Enhance Your Hello World Page",
    type: "task",
    priority: "high",
    timestamp: Date.now(),
    expiresAt: null,
    relatedFiles: ["hello-world.html", "styles.css", "script.js"],
    read: false
  };
  
  // Write the advice to a file
  const adviceFilePath = path.join(adviceDir, `${adviceId}.json`);
  console.log(`Writing advice to file: ${adviceFilePath}`);
  await fs.writeFile(adviceFilePath, JSON.stringify(advice, null, 2), 'utf8');
  
  return true;
}

// Run the function
sendHelloWorldAdvice()
  .then(success => {
    if (success) {
      console.log('\nHello world improvement advice sent successfully!');
      console.log('Check your Cline Ultra interface for the notification.');
      console.log(`Notification should appear in task: ${taskId}`);
    } else {
      console.error('\nFailed to send hello world improvement advice.');
    }
  })
  .catch(error => {
    console.error('Error sending advice:', error);
  });
