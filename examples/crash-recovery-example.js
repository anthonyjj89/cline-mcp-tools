/**
 * Example script demonstrating how to use the Crash Recovery feature
 * with the Crash Reports Directory functionality
 */

// This example shows how to use the MCP tool to recover a crashed conversation
// and save it to the crash reports directory for easy access

// In a real application, you would use the MCP client to call the tool
// Here we're just showing the parameters and expected response format

// Example of using the recover_crashed_chat MCP tool
async function recoverCrashedChat() {
  console.log('Recovering crashed chat...');
  
  // In a real application, you would use the MCP client like this:
  /*
  const result = await useMcpTool({
    server_name: "claude-task-reader",
    tool_name: "recover_crashed_chat",
    arguments: {
      task_id: "1742912459362", // Replace with your task ID
      max_length: 2000,
      include_code_snippets: true,
      save_to_crashreports: true
    }
  });
  */
  
  // For this example, we'll simulate the response
  const simulatedResponse = {
    task_id: "1742912459362",
    main_topic: "React Component Architecture",
    subtopics: ["State Management", "Props Drilling", "Context API", "Redux", "Component Lifecycle"],
    summary: "This conversation had 42 messages (21 from human, 21 from assistant). The main topics discussed were: React Component Architecture, State Management, Props Drilling, Context API, Redux. There were 3 file operations. 2 commands were executed. The conversation included 12 code blocks.",
    message_count: {
      total: 42,
      recovered: 42,
      human: 21,
      assistant: 21
    },
    formatted_message: "📋 CONVERSATION RECOVERY\n\nThis is a recovered conversation primarily about React Component Architecture...",
    message_sent: false,
    crash_report_saved: true,
    crash_report_id: "crash-1742912459362-abc123",
    crash_report_path: "/Users/username/Library/Application Support/Code/User/globalStorage/custom.claude-dev-ultra/crashReports/crash-1742912459362-abc123.json",
    instructions: "A crash report has been saved to the Cline Ultra extension. Open VS Code to view it."
  };
  
  console.log('Recovered chat information:');
  console.log(`Task ID: ${simulatedResponse.task_id}`);
  console.log(`Main Topic: ${simulatedResponse.main_topic}`);
  console.log(`Subtopics: ${simulatedResponse.subtopics.join(', ')}`);
  console.log(`Message Count: ${simulatedResponse.message_count.recovered} of ${simulatedResponse.message_count.total}`);
  console.log(`Crash Report Saved: ${simulatedResponse.crash_report_saved}`);
  console.log(`Crash Report ID: ${simulatedResponse.crash_report_id}`);
  console.log(`Crash Report Path: ${simulatedResponse.crash_report_path}`);
  
  return simulatedResponse;
}

// Example of accessing a saved crash report
async function accessCrashReport() {
  console.log('\nAccessing saved crash report...');
  
  // In a real application, you would read the crash report file like this:
  /*
  const fs = require('fs');
  const path = require('path');
  const os = require('os');
  
  // Get the crash reports directory path
  const homedir = os.homedir();
  const crashReportsDir = path.join(
    homedir, 
    'Library', 
    'Application Support', 
    'Code', 
    'User', 
    'globalStorage', 
    'custom.claude-dev-ultra', 
    'crashReports'
  );
  
  // Read the crash report file
  const crashReportId = 'crash-1742912459362-abc123';
  const crashReportPath = path.join(crashReportsDir, `${crashReportId}.json`);
  const crashReport = JSON.parse(fs.readFileSync(crashReportPath, 'utf8'));
  */
  
  // For this example, we'll simulate the crash report
  const simulatedCrashReport = {
    id: "crash-1742912459362-abc123",
    task_id: "1742912459362",
    timestamp: 1742912459362,
    summary: "This conversation had 42 messages (21 from human, 21 from assistant). The main topics discussed were: React Component Architecture, State Management, Props Drilling, Context API, Redux. There were 3 file operations. 2 commands were executed. The conversation included 12 code blocks.",
    main_topic: "React Component Architecture",
    subtopics: ["State Management", "Props Drilling", "Context API", "Redux"],
    active_files: ["src/components/App.js", "src/components/UserProfile.js", "src/context/UserContext.js"],
    open_questions: ["How can we optimize the re-rendering of nested components?"],
    current_status: "At the time of the crash, I was explaining how to use React Context to avoid props drilling. Specifically, I was working on creating a UserContext provider. The next step was likely to implement the consumer components.",
    formatted_message: "📋 CONVERSATION RECOVERY\n\nThis is a recovered conversation primarily about React Component Architecture...",
    read: false
  };
  
  console.log('Crash Report Contents:');
  console.log(`ID: ${simulatedCrashReport.id}`);
  console.log(`Task ID: ${simulatedCrashReport.task_id}`);
  console.log(`Timestamp: ${new Date(simulatedCrashReport.timestamp).toLocaleString()}`);
  console.log(`Main Topic: ${simulatedCrashReport.main_topic}`);
  console.log(`Active Files: ${simulatedCrashReport.active_files.join(', ')}`);
  console.log(`Open Questions: ${simulatedCrashReport.open_questions.join(', ')}`);
  console.log(`Current Status: ${simulatedCrashReport.current_status}`);
  console.log(`Read Status: ${simulatedCrashReport.read ? 'Read' : 'Unread'}`);
  
  return simulatedCrashReport;
}

// Example of marking a crash report as read
async function markCrashReportAsRead() {
  console.log('\nMarking crash report as read...');
  
  // In a real application, you would update the crash report file like this:
  /*
  const fs = require('fs');
  const path = require('path');
  const os = require('os');
  
  // Get the crash reports directory path
  const homedir = os.homedir();
  const crashReportsDir = path.join(
    homedir, 
    'Library', 
    'Application Support', 
    'Code', 
    'User', 
    'globalStorage', 
    'custom.claude-dev-ultra', 
    'crashReports'
  );
  
  // Read the crash report file
  const crashReportId = 'crash-1742912459362-abc123';
  const crashReportPath = path.join(crashReportsDir, `${crashReportId}.json`);
  const crashReport = JSON.parse(fs.readFileSync(crashReportPath, 'utf8'));
  
  // Update the read status
  crashReport.read = true;
  
  // Write the updated crash report back to the file
  fs.writeFileSync(crashReportPath, JSON.stringify(crashReport, null, 2), 'utf8');
  */
  
  console.log('Crash report marked as read');
}

// Run the examples
async function runExamples() {
  await recoverCrashedChat();
  await accessCrashReport();
  await markCrashReportAsRead();
  
  console.log('\nExamples completed successfully!');
}

runExamples().catch(error => {
  console.error('Error running examples:', error);
});
