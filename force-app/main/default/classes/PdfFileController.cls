public with sharing class PdfFileController {
    @AuraEnabled
    public static String getPdfAsBase64(Id contentVersionId) {
        ContentVersion cv = [
            SELECT VersionData
            FROM ContentVersion
            WHERE Id = :contentVersionId
            LIMIT 1
        ];
        return EncodingUtil.base64Encode(cv.VersionData);
    }

    
}
