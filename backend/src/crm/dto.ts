import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { ClientStatus, DealStage, Role, TaskPriority, TaskStatus, UserStatus } from "@prisma/client";
import { IsArray, IsBoolean, IsDateString, IsEmail, IsEnum, IsNumber, IsOptional, IsString, IsUrl, Max, Min, MinLength } from "class-validator";

export class RegisterDto {
  @ApiProperty({ example: "admin@nexusrm.ai" })
  @IsEmail()
  email: string;

  @ApiProperty({ example: "Администратор Nexus" })
  @IsString()
  name: string;

  @ApiProperty({ example: "admin123" })
  @IsString()
  @MinLength(6)
  password: string;

  @ApiPropertyOptional({ enum: Role })
  @IsOptional()
  @IsEnum(Role)
  role?: Role;
}

export class LoginDto {
  @ApiProperty({ example: "admin@nexusrm.ai" })
  @IsEmail()
  email: string;

  @ApiProperty({ example: "admin123" })
  @IsString()
  password: string;
}

export class RefreshDto {
  @ApiProperty()
  @IsString()
  refreshToken: string;
}

export class CreateClientDto {
  @ApiProperty({ example: "VectorCloud" })
  @IsString()
  name: string;

  @ApiProperty({ example: "B2B SaaS" })
  @IsString()
  industry: string;

  @ApiPropertyOptional({ example: "https://vectorcloud.ai" })
  @IsOptional()
  @IsUrl()
  website?: string;

  @ApiPropertyOptional({ enum: ClientStatus })
  @IsOptional()
  @IsEnum(ClientStatus)
  status?: ClientStatus;

  @ApiPropertyOptional({ type: [String], example: ["enterprise", "cloud"] })
  @IsOptional()
  @IsArray()
  tags?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  managerId?: string;
}

export class UpdateClientDto extends CreateClientDto {}

export class CreateDealDto {
  @ApiProperty({ example: "Программа cloud-миграции" })
  @IsString()
  title: string;

  @ApiProperty()
  @IsString()
  clientId: string;

  @ApiPropertyOptional({ enum: DealStage })
  @IsOptional()
  @IsEnum(DealStage)
  stage?: DealStage;

  @ApiProperty({ example: 42000 })
  @IsNumber()
  amount: number;

  @ApiProperty()
  @IsDateString()
  closeDate: string;

  @ApiPropertyOptional({ example: 72 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  probability?: number;
}

export class UpdateDealDto extends CreateDealDto {}

export class CreateTaskDto {
  @ApiProperty({ example: "Отправить письмо сегодня" })
  @IsString()
  title: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ enum: TaskPriority })
  @IsOptional()
  @IsEnum(TaskPriority)
  priority?: TaskPriority;

  @ApiPropertyOptional({ enum: TaskStatus })
  @IsOptional()
  @IsEnum(TaskStatus)
  status?: TaskStatus;

  @ApiProperty()
  @IsDateString()
  dueDate: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  assigneeId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  clientId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  dealId?: string;
}

export class UpdateTaskDto extends CreateTaskDto {}

export class PublicLeadDto {
  @ApiProperty({ example: "Acme Systems" })
  @IsString()
  company: string;

  @ApiProperty({ example: "ops@acme.com" })
  @IsEmail()
  email: string;

  @ApiPropertyOptional({ example: "Нужна CRM для delivery-команды" })
  @IsOptional()
  @IsString()
  message?: string;
}

export class PublicWebhookDto {
  @ApiProperty()
  @IsUrl()
  url: string;

  @ApiProperty({ example: "deal.won" })
  @IsString()
  event: string;
}

export class AiChatDto {
  @ApiProperty({ example: "Какие сделки сейчас самые рискованные?" })
  @IsString()
  @MinLength(2)
  message: string;
}

export class UpdateUserDto {
  @ApiPropertyOptional({ example: "Мария Чен" })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ enum: Role })
  @IsOptional()
  @IsEnum(Role)
  role?: Role;

  @ApiPropertyOptional({ enum: UserStatus })
  @IsOptional()
  @IsEnum(UserStatus)
  status?: UserStatus;

  @ApiPropertyOptional({ example: "Руководитель продаж" })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional({ example: "Коммерческий отдел" })
  @IsOptional()
  @IsString()
  department?: string;

  @ApiPropertyOptional({ example: "+7 999 000-00-00" })
  @IsOptional()
  @IsString()
  phone?: string;
}

export class CreateUserDto extends UpdateUserDto {
  @ApiProperty({ example: "manager@nexusrm.ai" })
  @IsEmail()
  email: string;

  @ApiProperty({ example: "Мария Чен" })
  @IsString()
  name: string;

  @ApiProperty({ example: "manager123" })
  @IsString()
  @MinLength(6)
  password: string;
}

export class WorkspaceSettingsDto {
  @ApiPropertyOptional({ example: "NexusRM" })
  @IsOptional()
  @IsString()
  workspaceName?: string;

  @ApiPropertyOptional({ example: "Europe/Moscow" })
  @IsOptional()
  @IsString()
  timezone?: string;

  @ApiPropertyOptional({ example: "RUB" })
  @IsOptional()
  @IsString()
  currency?: string;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  aiEnabled?: boolean;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  publicApiEnabled?: boolean;

  @ApiPropertyOptional({ example: false })
  @IsOptional()
  @IsBoolean()
  registrationEnabled?: boolean;

  @ApiPropertyOptional({ enum: Role })
  @IsOptional()
  @IsEnum(Role)
  defaultRole?: Role;
}

export class CreateApiKeyDto {
  @ApiProperty({ example: "Интеграция сайта" })
  @IsString()
  @MinLength(3)
  name: string;
}
