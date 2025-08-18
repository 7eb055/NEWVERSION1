# PowerShell script to replace all hardcoded API URLs

$sourceDir = "c:\Users\ryule\OneDrive\Desktop\version2\NEWVERSION1\eventfrontend\src"

# Get all JSX files recursively
$files = Get-ChildItem -Path $sourceDir -Filter "*.jsx" -Recurse

foreach ($file in $files) {
    $content = Get-Content $file.FullName -Raw
    
    # Replace the hardcoded API URLs
    $updatedContent = $content -replace '\$\{import\.meta\.env\.VITE_API_URL \|\| ''http://localhost:5001''\}', '${API_BASE_URL}'
    
    # Add import if not exists and we made changes
    if ($content -ne $updatedContent -and $updatedContent -notmatch "import.*API_BASE_URL.*from.*config/api") {
        # Find the last import statement
        $lines = $updatedContent -split "`n"
        $lastImportIndex = -1
        
        for ($i = 0; $i -lt $lines.Length; $i++) {
            if ($lines[$i] -match "^import\s") {
                $lastImportIndex = $i
            }
        }
        
        if ($lastImportIndex -ge 0) {
            # Insert the new import after the last import
            $newImport = "import { API_BASE_URL } from '../config/api';"
            $lines = $lines[0..$lastImportIndex] + $newImport + $lines[($lastImportIndex + 1)..($lines.Length - 1)]
            $updatedContent = $lines -join "`n"
        }
    }
    
    # Write back to file if changed
    if ($content -ne $updatedContent) {
        Set-Content -Path $file.FullName -Value $updatedContent -NoNewline
        Write-Host "Updated: $($file.FullName)"
    }
}

Write-Host "API URL update completed!"
