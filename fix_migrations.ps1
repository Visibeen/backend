# PowerShell script to fix migration status
# This marks old migrations as completed so only new ones run

Write-Host "🔧 Fixing migration status..." -ForegroundColor Cyan

# Get MySQL credentials from .env or use defaults
$mysqlUser = "root"
$mysqlPassword = Read-Host "Enter MySQL root password" -AsSecureString
$mysqlPasswordPlain = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($mysqlPassword))

# Path to MySQL executable (adjust if needed)
$mysqlPath = "C:\Program Files\MySQL\MySQL Server 8.0\bin\mysql.exe"

# Check if MySQL is in PATH
if (Get-Command mysql -ErrorAction SilentlyContinue) {
    $mysqlPath = "mysql"
}

Write-Host "📊 Marking old migrations as completed..." -ForegroundColor Yellow

# Run the SQL script
$sqlContent = @"
USE e2egroup;

INSERT IGNORE INTO SequelizeMeta (name) VALUES
('20250804070739-add_field_user.js'),
('20250804110850-add_field_user_restPassword_token.js'),
('20250805123329-create-business-account.js'),
('20250806063206-create-contact-us.js'),
('20250808061734-change_datetype_user_table.js'),
('20250813094805-create-edms.js'),
('20250814070826-create-post.js'),
('20250814071916-add_image_post.js'),
('20250814072610-create-account.js'),
('20250814085605-create-gst-information.js'),
('20250814091501-create-cro-information.js'),
('20250814095256-add_edms.js'),
('20250819093929-create-holiday.js'),
('20250827051745-add_field_account.js'),
('20250827070557-add_field_gstInformation.js'),
('20250901100759-add_field_countactus.js'),
('20250901102303-change-date_and_time-to-datetime.js'),
('20250901103914-add_field_gst_information.js'),
('20250905054650-create-gmb-profile-socre.js'),
('20250905064936-change_field_gmb_profile_score.js'),
('20251015055625-add-missing-columns-to-user-activities.js'),
('20251016000000-create-task.js'),
('20251016000001-create-gmb-account.js');
"@

$sqlContent | & $mysqlPath -u $mysqlUser -p"$mysqlPasswordPlain" 2>&1

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Migration status fixed successfully!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Now run: npx sequelize-cli db:migrate" -ForegroundColor Cyan
} else {
    Write-Host "❌ Failed to fix migrations. Error code: $LASTEXITCODE" -ForegroundColor Red
}
