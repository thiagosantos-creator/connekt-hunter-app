const seedPlan = {
  roles: ['administrator', 'headhunter', 'client-user', 'candidate'],
  permissions: [
    'vacancy:read',
    'vacancy:write',
    'candidate:read',
    'application:write',
  ],
  organizations: ['connekt-hunter-demo'],
};

async function main() {
  console.info(
    'Base seed plan for Connekt Hunter:',
    JSON.stringify(seedPlan, null, 2),
  );
}

void main();
