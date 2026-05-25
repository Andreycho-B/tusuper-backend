/* eslint-disable prettier/prettier */
import { IsString, IsNotEmpty, IsArray, IsNumber, MaxLength } from "class-validator";
import { PartialType, ApiProperty } from "@nestjs/swagger";

export class CreateRoleDto {
    @IsString()
    @IsNotEmpty()
    @MaxLength(50)
    @ApiProperty()
    readonly name: string;

    @IsString()
    @IsNotEmpty()
    @MaxLength(255)
    @ApiProperty()
    readonly description: string;

    @ApiProperty({
        example: [1, 2, 3],
        description: 'IDs de los módulos asignados al rol'
    })
    @IsArray()
    @IsNumber({}, { each: true })
    moduleIds: number[];
}
export class UpdateRoleDto extends PartialType(CreateRoleDto) { }