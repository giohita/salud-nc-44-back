import { Test, TestingModule } from '@nestjs/testing';
import { StatsService } from './stats.service';
import { PrismaService } from '../prisma/prisma.service';
import { BadRequestException } from '@nestjs/common';
import * as fs from 'fs';

jest.mock('fs', () => ({
  writeFileSync: jest.fn(),
  existsSync: jest.fn().mockReturnValue(false),
  mkdirSync: jest.fn(),
}));

describe('StatsService', () => {
  let service: StatsService;
  let prismaService: PrismaService;

  const mockPrismaService = {
    appointment: {
      findMany: jest.fn(),
      count: jest.fn(),
    },
    admin: {
      count: jest.fn(),
    },
    medic: {
      count: jest.fn(),
    },
    patient: {
      count: jest.fn(),
    },
    clinicalRecord: {
      findMany: jest.fn(),
    },
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StatsService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<StatsService>(StatsService);
    prismaService = module.get<PrismaService>(PrismaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('generateStats', () => {
    it('should throw BadRequestException for invalid format', async () => {
      await expect(
        service.generateStats('invalid', new Date(), new Date(), 'appointments')
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if endDate is before startDate', async () => {
      const startDate = new Date('2023-01-10');
      const endDate = new Date('2023-01-01');
      
      await expect(
        service.generateStats('csv', startDate, endDate, 'appointments')
      ).rejects.toThrow(BadRequestException);
    });

    it('should generate appointment stats in CSV format', async () => {
      const startDate = new Date('2023-01-01');
      const endDate = new Date('2023-01-31');
      
      const mockAppointments = [
        {
          id: '1',
          date: new Date('2023-01-15'),
          status: 'COMPLETED',
          type: 'VIRTUAL',
          medicId: '1',
          patientId: '1',
          medic: { name: 'Dr. Smith' },
          patient: { name: 'John Doe' },
        },
      ];
      
      mockPrismaService.appointment.findMany.mockResolvedValue(mockAppointments);
      
      const result = await service.generateStats('csv', startDate, endDate, 'appointments');
      
      expect(result).toHaveProperty('filePath');
      expect(result).toHaveProperty('fileName');
      expect(fs.writeFileSync).toHaveBeenCalled();
    });

    it('should generate users stats in Excel format', async () => {
      const startDate = new Date('2023-01-01');
      const endDate = new Date('2023-01-31');
      
      mockPrismaService.admin.count.mockResolvedValue(5);
      mockPrismaService.medic.count.mockResolvedValue(10);
      mockPrismaService.patient.count.mockResolvedValue(50);
      
      const result = await service.generateStats('excel', startDate, endDate, 'users');
      
      expect(result).toHaveProperty('filePath');
      expect(result).toHaveProperty('fileName');
      expect(fs.writeFileSync).toHaveBeenCalled();
    });

    it('should generate clinical stats in JSON format', async () => {
      const startDate = new Date('2023-01-01');
      const endDate = new Date('2023-01-31');
      
      const mockClinicalRecords = [
        {
          id: '1',
          diagnosis: 'Flu',
          treatment: 'Rest and fluids',
          createdAt: new Date('2023-01-15'),
          patientId: '1',
          medicId: '1',
          patient: { name: 'John Doe' },
          medic: { name: 'Dr. Smith' },
        },
      ];
      
      mockPrismaService.clinicalRecord.findMany.mockResolvedValue(mockClinicalRecords);
      
      const result = await service.generateStats('json', startDate, endDate, 'clinical');
      
      expect(result).toHaveProperty('filePath');
      expect(result).toHaveProperty('fileName');
      expect(fs.writeFileSync).toHaveBeenCalled();
    });
  });
});