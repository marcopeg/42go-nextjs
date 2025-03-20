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
      user_id: adminId,
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
