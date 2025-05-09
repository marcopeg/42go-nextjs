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
    await trx('auth.roles_grants').del();
    await trx('auth.roles_users').del();
    await trx('auth.grants').del();
    await trx('auth.roles').del();
    await trx('auth.users').del();
    await trx('auth.accounts').del();
    await trx('auth.verification_tokens').del();
    await trx('public.feedback').del();

    // Add Admin user
    const adminId = uuidv4();
    await trx('auth.users').insert({
      id: adminId,
      name: 'admin',
      email: 'admin@admin.com',
      password: await hashPassword('admin'),
      image: 'https://ui-avatars.com/api/?name=Admin+Admin',
      created_at: new Date(),
      updated_at: new Date(),
    });
    console.log(`Created Admin user with ID: ${adminId}`);

    // Add John Doe user
    const johnDoeId = uuidv4();
    await trx('auth.users').insert({
      id: johnDoeId,
      name: 'john',
      email: 'john.doe@example.com',
      password: await hashPassword('john'),
      image: 'https://api.dicebear.com/8.x/adventurer/svg?seed=john-doe',
      created_at: new Date(),
      updated_at: new Date(),
    });
    console.log(`Created John Doe user with ID: ${johnDoeId}`);

    // Add Jane Doe user
    const janeDoeId = uuidv4();
    await trx('auth.users').insert({
      id: janeDoeId,
      name: 'jane',
      email: 'jane.doe@example.com',
      password: await hashPassword('jane'),
      image: 'https://api.dicebear.com/8.x/adventurer/svg?seed=jane-doe',
      created_at: new Date(),
      updated_at: new Date(),
    });
    console.log(`Created Jane Doe user with ID: ${janeDoeId}`);

    // 2. Add the backoffice role with a text ID
    const backofficeRoleId = 'backoffice';
    await trx('auth.roles').insert({
      id: backofficeRoleId,
      title: 'Backoffice',
      description: 'Administrators with backoffice access',
      created_at: new Date(),
      updated_at: new Date(),
    });
    console.log(`Created backoffice role with ID: ${backofficeRoleId}`);

    const fooRoleId = 'foo';
    await trx('auth.roles').insert({
      id: fooRoleId,
      title: 'foo',
      description: 'Administrators with foo access',
      created_at: new Date(),
      updated_at: new Date(),
    });
    console.log(`Created foo role with ID: ${fooRoleId}`);

    const faaRoleId = 'faa';
    await trx('auth.roles').insert({
      id: faaRoleId,
      title: 'faa',
      description: 'Administrators with faa access',
      created_at: new Date(),
      updated_at: new Date(),
    });
    console.log(`Created faa role with ID: ${faaRoleId}`);

    // 3. Add the backoffice grant with a text ID
    const usersListGrantId = 'users:list';
    await trx('auth.grants').insert({
      id: usersListGrantId,
      title: 'List users',
      description: 'Let see all users in the system',
      created_at: new Date(),
      updated_at: new Date(),
    });
    console.log(`Created backoffice grant with ID: ${usersListGrantId}`);

    const usersEditGrantId = 'users:edit';
    await trx('auth.grants').insert({
      id: usersEditGrantId,
      title: 'Edit user',
      description: 'Let apply changes to a user',
      created_at: new Date(),
      updated_at: new Date(),
    });
    console.log(`Created backoffice grant with ID: ${usersEditGrantId}`);

    // 4. Associate the admin user to the backoffice role
    await trx('auth.roles_users').insert({
      role_id: backofficeRoleId,
      user_id: adminId,
      created_at: new Date(),
    });
    await trx('auth.roles_users').insert({
      role_id: fooRoleId,
      user_id: adminId,
      created_at: new Date(),
    });
    console.log(`Associated admin user with backoffice role`);

    // 5. Associate the users list to the backoffice role
    await trx('auth.roles_grants').insert({
      role_id: backofficeRoleId,
      grant_id: usersListGrantId,
      created_at: new Date(),
    });
    console.log(`Associated backoffice grant with backoffice role`);
  });

  console.log('Seed completed successfully!');
};
