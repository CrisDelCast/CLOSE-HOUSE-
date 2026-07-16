import { IsNotEmpty, IsString, IsArray, IsInt, Min, ArrayMinSize } from 'class-validator';

export class CreateExamQuestionDto {
  @IsString()
  @IsNotEmpty({ message: 'La pregunta no puede estar vacía.' })
  readonly questionText: string;

  @IsArray()
  @ArrayMinSize(2, { message: 'Debes proporcionar al menos 2 opciones de respuesta.' })
  @IsString({ each: true, message: 'Cada opción debe ser un texto.' })
  readonly options: string[];

  @IsInt()
  @Min(0, { message: 'El índice de la respuesta correcta debe ser igual o mayor a 0.' })
  readonly correctAnswerIndex: number;
}