import mongoose, { Schema, Document } from 'mongoose';
import bcrypt from 'bcrypt';
import { Logger, natsClient, Utils } from '@libs/common';
import { CreateUserDto, UpdateUserDto, UserResponseDto, UsersListResponseDto } from './dto/create-user.dto';

// User interface for MongoDB document
interface IUser extends Document {
  email: string;
  username: string;
  firstName: string;
  lastName: string;
  password: string;
  phone?: string;
  createdAt: Date;
  updatedAt: Date;
}

// User schema
const UserSchema: Schema = new Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  firstName: {
    type: String,
    required: true,
    trim: true
  },
  lastName: {
    type: String,
    required: true,
    trim: true
  },
  password: {
    type: String,
    required: true
  },
  phone: {
    type: String,
    optional: true,
    trim: true
  }
}, {
  timestamps: true
});

// Hash password before saving
UserSchema.pre<IUser>('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    const saltRounds = 12;
    this.password = await bcrypt.hash(this.password, saltRounds);
    next();
  } catch (error) {
    next(error as Error);
  }
});

// Remove password from JSON output
UserSchema.methods.toJSON = function() {
  const userObject = this.toObject();
  delete userObject.password;
  return userObject;
};

const User = mongoose.model<IUser>('User', UserSchema);

export class UsersService {
  private logger = Logger.getInstance();

  async createUser(userData: CreateUserDto): Promise<UserResponseDto> {
    try {
      this.logger.info('Creating new user', { email: userData.email });

      // Check if user already exists
      const existingUser = await User.findOne({
        $or: [
          { email: userData.email },
          { username: userData.username }
        ]
      });

      if (existingUser) {
        throw new Error('User with this email or username already exists');
      }

      // Create new user
      const user = new User(userData);
      await user.save();

      // Publish user created event
      await natsClient.publishEvent({
        eventType: 'user.created',
        data: {
          userId: user._id.toString(),
          email: user.email,
          username: user.username
        },
        timestamp: new Date(),
        source: 'users-service',
        correlationId: Utils.generateCorrelationId()
      });

      this.logger.info('User created successfully', { userId: user._id });

      return this.mapToResponseDto(user);
    } catch (error) {
      this.logger.error('Failed to create user', error as Error);
      throw error;
    }
  }

  async getUserById(userId: string): Promise<UserResponseDto | null> {
    try {
      this.logger.debug('Getting user by ID', { userId });

      const user = await User.findById(userId);
      
      if (!user) {
        return null;
      }

      return this.mapToResponseDto(user);
    } catch (error) {
      this.logger.error('Failed to get user by ID', error as Error);
      throw error;
    }
  }

  async getUsers(pagination: any = {}): Promise<UsersListResponseDto> {
    try {
      const page = pagination.page || 1;
      const limit = pagination.limit || 10;
      const sortBy = pagination.sortBy || 'createdAt';
      const sortOrder = pagination.sortOrder === 'asc' ? 1 : -1;

      this.logger.debug('Getting users list', { page, limit, sortBy, sortOrder });

      const skip = (page - 1) * limit;
      const sortOptions: any = {};
      sortOptions[sortBy] = sortOrder;

      const [users, total] = await Promise.all([
        User.find()
          .sort(sortOptions)
          .skip(skip)
          .limit(limit)
          .exec(),
        User.countDocuments()
      ]);

      const totalPages = Math.ceil(total / limit);

      return {
        data: users.map(user => this.mapToResponseDto(user)),
        pagination: {
          page,
          limit,
          total,
          totalPages,
          hasNext: page < totalPages,
          hasPrev: page > 1
        }
      };
    } catch (error) {
      this.logger.error('Failed to get users list', error as Error);
      throw error;
    }
  }

  async updateUser(userId: string, updateData: UpdateUserDto): Promise<UserResponseDto | null> {
    try {
      this.logger.info('Updating user', { userId });

      // Check if email or username already exists (if being updated)
      if (updateData.email || updateData.username) {
        const existingUser = await User.findOne({
          _id: { $ne: userId },
          $or: [
            ...(updateData.email ? [{ email: updateData.email }] : []),
            ...(updateData.username ? [{ username: updateData.username }] : [])
          ]
        });

        if (existingUser) {
          throw new Error('User with this email or username already exists');
        }
      }

      const user = await User.findByIdAndUpdate(
        userId,
        { $set: updateData },
        { new: true, runValidators: true }
      );

      if (!user) {
        return null;
      }

      // Publish user updated event
      await natsClient.publishEvent({
        eventType: 'user.updated',
        data: {
          userId: user._id.toString(),
          email: user.email,
          username: user.username,
          updatedFields: Object.keys(updateData)
        },
        timestamp: new Date(),
        source: 'users-service',
        correlationId: Utils.generateCorrelationId()
      });

      this.logger.info('User updated successfully', { userId });

      return this.mapToResponseDto(user);
    } catch (error) {
      this.logger.error('Failed to update user', error as Error);
      throw error;
    }
  }

  async deleteUser(userId: string): Promise<{ success: boolean }> {
    try {
      this.logger.info('Deleting user', { userId });

      const user = await User.findByIdAndDelete(userId);

      if (!user) {
        return { success: false };
      }

      // Publish user deleted event
      await natsClient.publishEvent({
        eventType: 'user.deleted',
        data: {
          userId: user._id.toString(),
          email: user.email,
          username: user.username
        },
        timestamp: new Date(),
        source: 'users-service',
        correlationId: Utils.generateCorrelationId()
      });

      this.logger.info('User deleted successfully', { userId });

      return { success: true };
    } catch (error) {
      this.logger.error('Failed to delete user', error as Error);
      throw error;
    }
  }

  async getUserByEmail(email: string): Promise<UserResponseDto | null> {
    try {
      const user = await User.findOne({ email: email.toLowerCase() });
      
      if (!user) {
        return null;
      }

      return this.mapToResponseDto(user);
    } catch (error) {
      this.logger.error('Failed to get user by email', error as Error);
      throw error;
    }
  }

  async getUserByUsername(username: string): Promise<UserResponseDto | null> {
    try {
      const user = await User.findOne({ username });
      
      if (!user) {
        return null;
      }

      return this.mapToResponseDto(user);
    } catch (error) {
      this.logger.error('Failed to get user by username', error as Error);
      throw error;
    }
  }

  async validatePassword(userId: string, password: string): Promise<boolean> {
    try {
      const user = await User.findById(userId).select('+password');
      
      if (!user) {
        return false;
      }

      return await bcrypt.compare(password, user.password);
    } catch (error) {
      this.logger.error('Failed to validate password', error as Error);
      return false;
    }
  }

  private mapToResponseDto(user: IUser): UserResponseDto {
    return {
      id: user._id.toString(),
      email: user.email,
      username: user.username,
      firstName: user.firstName,
      lastName: user.lastName,
      phone: user.phone,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt
    };
  }
}
