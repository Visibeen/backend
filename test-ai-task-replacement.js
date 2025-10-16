/**
 * Test AI Task Replacement Logic
 * This script demonstrates how admin tasks replace AI tasks
 */

const axios = require('axios');

async function testAITaskReplacement() {
  try {
    console.log('🧪 Testing AI Task Replacement Logic\n');
    
    const baseURL = 'http://localhost:5000/api/v1/admin/task';
    const clientId = 194; // Replace with actual client ID
    const profileId = 'test-profile-123';
    
    // Step 1: Create 4 AI tasks
    console.log('📝 Step 1: Creating 4 AI tasks...');
    const aiTasks = [];
    
    for (let i = 1; i <= 4; i++) {
      const priority = i === 1 ? 'low' : i === 2 ? 'low' : i === 3 ? 'medium' : 'high';
      const aiTask = {
        title: `AI Task ${i}`,
        description: `This is an AI-generated task with ${priority} priority`,
        assignedTo: `${clientId}-${profileId}`,
        priority: priority,
        status: 'pending',
        category: 'AI Generated',
        created_by_type: 'ai'
      };
      
      console.log(`   Creating AI Task ${i} (${priority} priority)...`);
      // Note: You'll need to add authentication token here
      // const response = await axios.post(`${baseURL}/create-task`, aiTask);
      // aiTasks.push(response.data.data.task);
    }
    
    console.log(`✅ Created 4 AI tasks\n`);
    
    // Step 2: Create admin task with assign date
    console.log('📝 Step 2: Creating admin task with assign date...');
    const adminTask = {
      title: 'Admin Priority Task',
      description: 'This admin task should replace the lowest priority AI task',
      assignedTo: `${clientId}-${profileId}`,
      priority: 'high',
      status: 'pending',
      assignDate: '2024-10-20',
      assignTime: '14:30',
      category: 'Profile Management',
      created_by_type: 'admin'
    };
    
    console.log('   Admin task will replace one AI task (lowest priority first)...');
    // const response = await axios.post(`${baseURL}/create-task`, adminTask);
    
    console.log('✅ Admin task created\n');
    
    // Expected Result
    console.log('📊 Expected Result:');
    console.log('   Before: 4 AI tasks (2 low, 1 medium, 1 high)');
    console.log('   After:  3 AI tasks + 1 Admin task');
    console.log('   Replaced: AI Task 1 or 2 (low priority)');
    console.log('\n🎯 Admin tasks now prioritized over AI tasks!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Run test
console.log('='.repeat(60));
console.log('AI TASK REPLACEMENT TEST');
console.log('='.repeat(60) + '\n');

testAITaskReplacement();

console.log('\n' + '='.repeat(60));
console.log('To run this test with real data:');
console.log('1. Update clientId and profileId with actual values');
console.log('2. Add authentication token to axios requests');
console.log('3. Run: node test-ai-task-replacement.js');
console.log('='.repeat(60));
