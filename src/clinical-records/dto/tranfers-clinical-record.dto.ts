import { IsInt } from "class-validator";

export class TransferClinicalRecordDto {
    @IsInt()
    newMedId: number
}