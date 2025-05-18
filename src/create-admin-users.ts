import { AppDataSource } from './config/database';
import { User, UserRole } from './entities/User';
import bcrypt from 'bcrypt';

const createAdminUsers = async () => {
  try {
    // Initialize the database connection
    await AppDataSource.initialize();
    console.log('Database connection initialized');

    const userRepository = AppDataSource.getRepository(User);

    // Create first admin user
    const user1Password = await bcrypt.hash('night_!!!', 10);
    const user1 = userRepository.create({
      email: 'jtsf71@gmail.com',
      password: user1Password,
      firstName: 'Admin',
      lastName: 'User',
      role: UserRole.ADMIN,
      isActive: true,
    });

    // Create second admin user
    const user2Password = await bcrypt.hash('day_!!!', 10);
    const user2 = userRepository.create({
      email: 'martin@finesf.com',
      password: user2Password,
      firstName: 'Martin',
      lastName: 'Admin',
      role: UserRole.ADMIN,
      isActive: true,
    });

    // Save users to database
    await userRepository.save([user1, user2]);
    
    console.log('Admin users created successfully:');
    console.log('- jtsf71@gmail.com / night_!!!');
    console.log('- martin@finesf.com / day_!!!');

    await AppDataSource.destroy();
  } catch (error) {
    console.error('Error creating admin users:', error);
    process.exit(1);
  }
};

createAdminUsers();