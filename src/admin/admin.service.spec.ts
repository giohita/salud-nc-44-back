import { Test, TestingModule } from '@nestjs/testing';
import { AdminService } from './admin.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { ConflictException, NotFoundException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';

jest.mock('bcryptjs', () => ({
  hash: jest.fn().mockResolvedValue('hashedPassword'),
}));

describe('AdminService', () => {
  let service: AdminService;
  let prismaService: PrismaService;

  const mockPrismaService = {
    admin: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
    medic: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
    patient: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
    appointment: {
      findMany: jest.fn(),
      count: jest.fn(),
    },
    clinicalRecord: {
      deleteMany: jest.fn(),
    },
    $transaction: jest.fn((callback) => callback(mockPrismaService)),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<AdminService>(AdminService);
    prismaService = module.get<PrismaService>(PrismaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createUser', () => {
    it('should create an admin user successfully', async () => {
      const createUserDto: CreateUserDto = {
        Email: 'admin@example.com',
        password: 'Password123!',
        Name: 'Admin User',
        Lastname: 'Admin Lastname',
        DNI: '12345678A',
        userType: 'ADMIN',
      };

      mockPrismaService.admin.findUnique.mockResolvedValue(null);
      mockPrismaService.medic.findUnique.mockResolvedValue(null);
      mockPrismaService.patient.findUnique.mockResolvedValue(null);
      mockPrismaService.admin.create.mockResolvedValue({
        id: '1',
        ...createUserDto,
        password: 'hashedPassword',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await service.createUser(createUserDto);

      expect(result).toHaveProperty('id');
      expect(result.email).toBe(createUserDto.Email);
      expect(bcrypt.hash).toHaveBeenCalledWith(createUserDto.password, 10);
      expect(mockPrismaService.admin.create).toHaveBeenCalled();
    });

    it('should throw ConflictException if email already exists', async () => {
      const createUserDto: CreateUserDto = {
        Email: 'existing@example.com',
        password: 'Password123!',
        Name: 'Test User',
        Lastname: 'Test Lastname',
        DNI: '12345678A',
        userType: 'ADMIN',
      };

      mockPrismaService.admin.findUnique.mockResolvedValue({ id: '1', Email: 'existing@example.com' });
      mockPrismaService.medic.findUnique.mockResolvedValue(null);
      mockPrismaService.patient.findUnique.mockResolvedValue(null);

      await expect(service.createUser(createUserDto)).rejects.toThrow(ConflictException);
    });
  });

  describe('listUsers', () => {
    it('should return paginated list of users', async () => {
      const mockAdmins = [{ id: '1', Name: 'Admin 1', Email: 'admin1@example.com' }];
      const mockMedics = [{ id: '2', Name: 'Medic 1', Email: 'medic1@example.com' }];
      const mockPatients = [{ id: '3', Name: 'Patient 1', Email: 'patient1@example.com' }];

      mockPrismaService.admin.findMany.mockResolvedValue(mockAdmins);
      mockPrismaService.medic.findMany.mockResolvedValue(mockMedics);
      mockPrismaService.patient.findMany.mockResolvedValue(mockPatients);
      
      mockPrismaService.admin.count.mockResolvedValue(1);
      mockPrismaService.medic.count.mockResolvedValue(1);
      mockPrismaService.patient.count.mockResolvedValue(1);

      const result = await service.listUsers(1, 10);

      expect(result.data).toHaveLength(3);
      expect(result.meta.total).toBe(3);
      expect(result.meta.page).toBe(1);
      expect(result.meta.limit).toBe(10);
    });

    it('should filter users by type', async () => {
      const mockAdmins = [{ id: '1', Name: 'Admin 1', Email: 'admin1@example.com' }];
      
      mockPrismaService.admin.findMany.mockResolvedValue(mockAdmins);
      mockPrismaService.admin.count.mockResolvedValue(1);

      const result = await service.listUsers(1, 10, 'ADMIN');

      expect(result.data).toHaveLength(1);
      expect(result.meta.total).toBe(1);
      expect(mockPrismaService.medic.findMany).not.toHaveBeenCalled();
      expect(mockPrismaService.patient.findMany).not.toHaveBeenCalled();
    });
  });

  describe('getUserById', () => {
    it('should return a user by id', async () => {
      const mockUser = { id: '1', Name: 'Admin 1', Email: 'admin1@example.com' };
      mockPrismaService.admin.findUnique.mockResolvedValue(mockUser);

      const result = await service.getUserById(1);

      expect(result).toEqual(mockUser);
    });

    it('should throw NotFoundException if user not found', async () => {
      mockPrismaService.admin.findUnique.mockResolvedValue(null);
      mockPrismaService.medic.findUnique.mockResolvedValue(null);
      mockPrismaService.patient.findUnique.mockResolvedValue(null);

      await expect(service.getUserById(999)).rejects.toThrow(NotFoundException);
    });
  });

  describe('updateUser', () => {
    it('should update a user successfully', async () => {
      const userId = '1';
      const updateUserDto: UpdateUserDto = {
        Name: 'Updated Name',
      };

      const mockUser = { 
        id: userId, 
        Name: 'Original Name', 
        Email: 'admin@example.com',
        userType: 'ADMIN'
      };
      
      const updatedUser = { 
        ...mockUser, 
        Name: updateUserDto.Name,
        updatedAt: new Date()
      };

      mockPrismaService.admin.findUnique.mockResolvedValue(mockUser);
      mockPrismaService.admin.update.mockResolvedValue(updatedUser);

      const result = await service.updateUser(Number(userId), updateUserDto);

      expect(result).toEqual(updatedUser);
      expect(mockPrismaService.admin.update).toHaveBeenCalledWith({
        where: { id: Number(userId) },
        data: updateUserDto,
      });
    });
  });

  describe('deleteUser', () => {
    it('should delete a user successfully', async () => {
      const userId = '1';
      const mockUser = { 
        id: Number(userId), 
        Name: 'Admin User',   
        Email: 'admin@example.com' 
      };

      mockPrismaService.admin.findUnique.mockResolvedValue(mockUser);
      mockPrismaService.admin.count.mockResolvedValue(2); // More than one admin exists
      mockPrismaService.admin.delete.mockResolvedValue(mockUser);

      const result = await service.deleteUser(userId);

      expect(result).toEqual(mockUser);
      expect(mockPrismaService.admin.delete).toHaveBeenCalledWith({
        where: { id: Number(userId) },
      });
    });

    it('should throw an error when trying to delete the last admin', async () => {
      const userId = '1';
      const mockUser = { 
        id: Number(userId), 
        Name: 'Last Admin',   
        Email: 'admin@example.com' 
      };

      mockPrismaService.admin.findUnique.mockResolvedValue(mockUser);
      mockPrismaService.admin.count.mockResolvedValue(1); // Only one admin exists

      await expect(service.deleteUser(userId)).rejects.toThrow(
        'No se puede eliminar el último administrador del sistema'
      );
    });
  });
});