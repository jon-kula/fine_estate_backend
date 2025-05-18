import { AppDataSource } from './config/database';
import bcrypt from 'bcryptjs';
import { User, UserRole } from './entities/User';

async function initializeDatabase() {
  try {
    await AppDataSource.initialize();
    console.log('✅ Database connection established');

    // Create admin user if it doesn't exist
    const userRepository = AppDataSource.getRepository(User);
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@fineestate.com';
    
    const existingAdmin = await userRepository.findOne({
      where: { email: adminEmail }
    });

    if (!existingAdmin) {
      const adminPassword = process.env.ADMIN_PASSWORD || 'changeme123';
      const hashedPassword = await bcrypt.hash(adminPassword, 10);
      
      const admin = userRepository.create({
        email: adminEmail,
        password: hashedPassword,
        firstName: 'Admin',
        lastName: 'User',
        role: UserRole.ADMIN,
        isActive: true
      });

      await userRepository.save(admin);
      console.log('✅ Admin user created');
      console.log(`Email: ${adminEmail}`);
      console.log(`Password: ${adminPassword} (please change this!)`);
    } else {
      console.log('ℹ️ Admin user already exists');
    }

    console.log('✅ Database initialization complete');
  } catch (error) {
    console.error('❌ Database initialization failed:', error);
  } finally {
    await AppDataSource.destroy();
  }
}

initializeDatabase();