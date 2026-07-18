import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TenantsService } from '../tenants/tenants.service';
import { CreateResidentDto } from './dto/create-resident.dto';
import { Resident } from './entities/resident.entity';
 // Asegúrate de importar la entidad Apartment
import * as ExcelJS from 'exceljs';
import { Apartment } from '../properties/entities/apartment.entity';

@Injectable()
export class ResidentsService {
  constructor(
    @InjectRepository(Resident)
    private readonly residentRepository: Repository<Resident>,
    @InjectRepository(Apartment)
    private readonly apartmentRepository: Repository<Apartment>, // 👈 Necesitamos este repositorio para buscar los IDs
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

  // 2. Obtener todos los residentes de un conjunto (Tenant) incluyendo su apartamento
  async findAll(tenantId: string) {
    return this.residentRepository.find({
      where: { tenantId },
      relations: ['apartment'], // 👈 Trae la info del apto mapeada en lugar de texto plano
      order: { fullName: 'ASC' },
    });
  }

 /* // 3. ✨ MÉTODO REFRACTORIZADO: Carga masiva adaptada al modelo relacional
  async processBulkUpload(tenantId: string, file: Express.Multer.File) {
    await this.tenantsService.findById(tenantId);

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(file.buffer as any);

    const worksheet = workbook.getWorksheet(1);
    if (!worksheet) { 
      throw new BadRequestException('No se pudo leer la hoja de cálculo.');
    }

    // ⚡ Optimización PRO: Traemos todos los apartamentos del Tenant a memoria de una sola vez
    // Esto evita hacer un query a la base de datos por cada fila del Excel (patrón anti-target N+1)
    const apartments = await this.apartmentRepository.find({ where: { tenantId } });
    
    // Creamos un mapa indexado por "Bloque-Numero" (ej: "Torre A-101") para buscar en O(1)
    const apartmentMap = new Map<string, string>();
    apartments.forEach(apto => {
      const key = `${apto.block.trim().toUpperCase()}-${apto.number.trim().toUpperCase()}`;
      apartmentMap.set(key, apto.id);
    });

    const residentsToInsert: Partial<Resident>[] = [];
    const errors: string[] = [];

    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return; // Omitir encabezados

      const fullName = row.getCell(1).text?.trim();
      const documentId = row.getCell(2).text?.trim();
      const block = row.getCell(3).text?.trim();  // Ej: "Torre A"
      const unitNumber = row.getCell(4).text?.trim(); // Ej: "101"
      const phone = row.getCell(5).text?.trim() || null;
      const email = row.getCell(6).text?.trim() || null;

      if (!fullName || !documentId || !block || !unitNumber) {
        if (fullName || documentId) {
          errors.push(`Fila ${rowNumber}: Datos incompletos (Faltan campos obligatorios).`);
        }
        return;
      }

      // Generamos la llave para buscar el apartamento en nuestro mapa en memoria
      const aptoKey = `${block.toUpperCase()}-${unitNumber.toUpperCase()}`;
      const apartmentId = apartmentMap.get(aptoKey);

      // 🛑 Si el apartamento no existe en la BD, no podemos meter al residente
      if (!apartmentId) {
        errors.push(`Fila ${rowNumber}: El apartamento "${unitNumber}" en el bloque "${block}" no existe en el sistema.`);
        return;
      }

      residentsToInsert.push({
        tenantId,
        fullName,
        documentId,
        apartmentId, // 👈 Insertamos el UUID real indexado
        phone,
        email,
      });
    });

    if (residentsToInsert.length === 0) {
      return {
        success: false,
        message: 'No se procesó ningún registro.',
        errors,
      };
    }

    // Insertar en bloque de forma masiva
    await this.residentRepository
      .createQueryBuilder()
      .insert()
      .into(Resident)
      .values(residentsToInsert)
      .execute();

    return {
      success: true,
      message: `Carga masiva finalizada. Se registraron ${residentsToInsert.length} residentes con éxito.`,
      recordsCount: residentsToInsert.length,
      errors: errors.length > 0 ? errors : undefined, // Te devuelve qué filas fallaron por si el admin escribió mal un apto
    };
  }*/
}