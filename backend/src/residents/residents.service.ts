import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TenantsService } from '../tenants/tenants.service';
import { CreateResidentDto } from './dto/create-resident.dto';
import { Resident } from './entities/resident.entity';
import * as ExcelJS from 'exceljs';

@Injectable()
export class ResidentsService {
  constructor(
    @InjectRepository(Resident)
    private readonly residentRepository: Repository<Resident>,
    private readonly tenantsService: TenantsService,
  ) {}

  // 1. Crear un residente de forma individual
  async create(tenantId: string, createResidentDto: CreateResidentDto) {
    await this.tenantsService.findById(tenantId);
    const resident = this.residentRepository.create({
      ...createResidentDto,
      tenantId,
    });

    return this.residentRepository.save(resident);
  }

  // 2. Obtener todos los residentes de un conjunto (Tenant) ordenados por nombre
  findAll(tenantId: string) {
    return this.residentRepository.find({
      where: { tenantId },
      order: { fullName: 'ASC' },
    });
  }

  // 3. ✨ NUEVO MÉTODO: Procesamiento de Excel en memoria y Bulk Insert optimizado
  async processBulkUpload(tenantId: string, file: Express.Multer.File) {
    // Validar que el Tenant realmente exista usando tu servicio inyectado
    await this.tenantsService.findById(tenantId);

    const workbook = new ExcelJS.Workbook();
    // Cargar el archivo directamente desde el búfer de memoria de la petición HTTP/ Forzamos a TypeScript a entender el buffer en memoria de Multer como el de Node.js
    // Crea una nueva instancia de Buffer garantizada de Node.js a partir del array de bytes
    await workbook.xlsx.load(file.buffer as any);

    const worksheet = workbook.getWorksheet(1); // Seleccionar la primera hoja
    const residentsToInsert: any[] = [];

    // Iterar las filas del Excel (Asumiendo que la fila 1 contiene los encabezados)
    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return; // Omitir la fila de encabezados

      const fullName = row.getCell(1).text?.trim();
      const documentId = row.getCell(2).text?.trim();
      const unitNumber = row.getCell(3).text?.trim();
      const phone = row.getCell(4).text?.trim() || null;
      const vehiclePlate = row.getCell(5).text?.trim() || null;
      const email = row.getCell(6).text?.trim() || null;

      // Validación de datos mínimos requeridos por fila antes de guardarla
      if (fullName && documentId && unitNumber) {
        residentsToInsert.push({
          tenantId, // Mapeo de la llave foránea directa
          fullName,
          documentId,
          unitNumber,
          phone,
          vehiclePlate,
          email,
        });
      }
    });

    if (residentsToInsert.length === 0) {
      return {
        success: false,
        message: 'No se encontraron filas con registros válidos (Nombre, Documento y Unidad) para procesar.',
      };
    }

    // Ejecutar Bulk Insert masivo en una sola transacción SQL ultra eficiente
    await this.residentRepository
      .createQueryBuilder()
      .insert()
      .into(Resident)
      .values(residentsToInsert)
      .execute();

    return {
      success: true,
      message: `Carga masiva finalizada con éxito. Se registraron ${residentsToInsert.length} residentes.`,
      recordsCount: residentsToInsert.length,
    };
  }
}