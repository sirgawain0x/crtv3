// Quick script to manually sync a MeToken
const txHash = '0xd51fc363b2f986cea6ff9bdc2622da462008715961d341c43847223a4c379753';

fetch('http://localhost:3000/api/metokens/sync', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ transactionHash: txHash })
})
.then(res => res.json())
.then(data => console.log('✅ Sync result:', data))
.catch(err => console.error('❌ Error:', err));
