/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { v4: uuidv4 } = require('uuid');
// eslint-disable-next-line @typescript-eslint/no-require-imports
const bcrypt = require('bcrypt');

exports.seed = async function (knex) {
  // Function to hash password
  const hashPassword = async password => {
    const saltRounds = 10;
    return bcrypt.hash(password, saltRounds);
  };

  // Create a transaction to ensure all operations succeed or fail together
  await knex.transaction(async trx => {
    // Delete existing data in reverse order of dependencies
    console.log('Clearing existing data...');
    await trx('auth.groups_grants').del();
    await trx('auth.groups_users').del();
    await trx('auth.grants').del();
    await trx('auth.groups').del();
    // Don't delete users table as it may contain important user data

    // 1. Get or create admin user
    let adminUserId;
    const existingAdmin = await trx('auth.users').where({ email: 'admin@example.com' }).first();

    if (existingAdmin) {
      console.log(`Admin user already exists with ID: ${existingAdmin.id}`);
      adminUserId = existingAdmin.id;
    } else {
      adminUserId = uuidv4();
      await trx('auth.users').insert({
        id: adminUserId,
        name: 'admin',
        email: 'admin@example.com',
        password: await hashPassword('admin'),
        created_at: new Date(),
        updated_at: new Date(),
      });
      console.log(`Created admin user with ID: ${adminUserId}`);
    }

    // 2. Add the backoffice group
    const [backofficeGroup] = await trx('auth.groups')
      .insert({
        title: 'backoffice',
        description: 'Administrators with backoffice access',
        created_at: new Date(),
        updated_at: new Date(),
      })
      .returning('id');

    console.log(`Created backoffice group with ID: ${backofficeGroup.id}`);

    // 3. Add the backoffice grant
    const [backofficeGrant] = await trx('auth.grants')
      .insert({
        title: 'backoffice',
        description: 'Permission to access and manage backoffice functionality',
        created_at: new Date(),
        updated_at: new Date(),
      })
      .returning('id');

    console.log(`Created backoffice grant with ID: ${backofficeGrant.id}`);

    // 4. Associate the admin user to the backoffice group
    await trx('auth.groups_users').insert({
      group_id: backofficeGroup.id,
      user_id: adminUserId,
      created_at: new Date(),
    });

    console.log(`Associated admin user with backoffice group`);

    // 5. Associate the backoffice grant to the backoffice group
    await trx('auth.groups_grants').insert({
      group_id: backofficeGroup.id,
      grant_id: backofficeGrant.id,
      created_at: new Date(),
    });

    console.log(`Associated backoffice grant with backoffice group`);
  });

  console.log('Seed completed successfully!');
};
