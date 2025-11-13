public with sharing class CmsContentService {

    // ---------- DTOs ----------

    public class SectionDTO {
        @AuraEnabled public String Title;
        @AuraEnabled public String SectionKey;
        @AuraEnabled public String Order;          // TEXT, sort client/server by int
        @AuraEnabled public String Subtitle;       // RTE rendered as HTML
        @AuraEnabled public String ProductSlug;
        @AuraEnabled public String GroupName;      // Renamed from Group (reserved word)
        @AuraEnabled public String AutoQuery;      // "true"/"false" (TEXT)
        @AuraEnabled public String AutoCategory;
        @AuraEnabled public String AutoEngine;
        @AuraEnabled public String AutoTags;
        @AuraEnabled public List<String> ManualItems;
    }

    public class DocDTO {
        @AuraEnabled public String title;
        @AuraEnabled public String urlName;     // Document.slug (contentUrlName)
        @AuraEnabled public String contentKey;  // for /s/cms-document/{key}
        @AuraEnabled public String fileUrl;     // media/source URL
        @AuraEnabled public String altText;     // for tooltips / search
        @AuraEnabled public String thumbUrl;
    }

    public class ReleaseDTO {
        @AuraEnabled public String Title;
        @AuraEnabled public Date   PublishedDate;
        @AuraEnabled public String ItemOrder;        // TEXT
        @AuraEnabled public String ExternalDocSlug;  // Document slug
        @AuraEnabled public String InternalDocSlug;  // Document slug
    }

    public class ReleaseViewDTO {
        @AuraEnabled public String title;
        @AuraEnabled public Date   publishedDate;
        @AuraEnabled public String externalUrl;  // resolved file URL
        @AuraEnabled public String internalUrl;  // resolved file URL (null for guest)
    }

    // ---------- Shared helpers ----------

    private static Id net() {
        return Network.getNetworkId();
    }

    // Safely extract a String-ish value from a CMS node
    private static String getTextNode(Map<String, ConnectApi.ManagedContentNodeValue> nodes, String key) {
        if (nodes == null) return null;
        ConnectApi.ManagedContentNodeValue v = nodes.get(key);
        if (v == null) return null;

        // Plain text
        if (v instanceof ConnectApi.ManagedContentTextNodeValue) {
            return ((ConnectApi.ManagedContentTextNodeValue)v).value;
        }

        // Media -> main URL as string
        if (v instanceof ConnectApi.ManagedContentMediaNodeValue) {
            ConnectApi.ManagedContentMediaNodeValue mv = (ConnectApi.ManagedContentMediaNodeValue)v;
            return mv.url;
        }

        // Unknown node type – just ignore
        return null;
    }

    // Safely extract a Date from a CMS node
    private static Date getDateNode(Map<String, ConnectApi.ManagedContentNodeValue> nodes, String key) {
        if (nodes == null) return null;
        ConnectApi.ManagedContentNodeValue v = nodes.get(key);
        if (v == null) return null;

        // Date node: value is a Datetime, convert to Date
        if (v instanceof ConnectApi.ManagedContentDateNodeValue) {
            Datetime dt = ((ConnectApi.ManagedContentDateNodeValue)v).value;
            return dt == null ? null : dt.date();
        }

        // DateTime node: dateTimeValue is a Datetime, convert to Date
        if (v instanceof ConnectApi.ManagedContentDateAndTimeNodeValue) {
            Datetime dt = ((ConnectApi.ManagedContentDateAndTimeNodeValue)v).dateTimeValue;
            return dt == null ? null : dt.date();
        }

        return null;
    }

    // Safely extract a URL from a media node (thumbnail or main)
    private static String getMediaUrl(Map<String, ConnectApi.ManagedContentNodeValue> nodes, String key, Boolean thumbnail) {
        if (nodes == null) return null;
        ConnectApi.ManagedContentNodeValue v = nodes.get(key);
        if (v == null) return null;

        if (v instanceof ConnectApi.ManagedContentMediaNodeValue) {
            ConnectApi.ManagedContentMediaNodeValue mv = (ConnectApi.ManagedContentMediaNodeValue)v;
            if (thumbnail) {
                if (mv.thumbnailUrl != null) return mv.thumbnailUrl;
                return mv.url;
            } else {
                return mv.url;
            }
        }

        return null;
    }

    private static Integer toInt(String s) {
        if (String.isBlank(s)) return 0;
        s = s.replaceAll('[^0-9]', '');
        return s == '' ? 0 : Integer.valueOf(s);
    }

    // ---------- Sections ----------

    @AuraEnabled(cacheable=true)
    public static List<SectionDTO> getSections(String productSlug, String groupName) {
        // Get all Product_Section items and filter in Apex
        ConnectApi.ManagedContentVersionCollection col =
            ConnectApi.ManagedContent.getAllManagedContent(
                String.valueOf(net()),
                0,
                200,
                UserInfo.getLanguage(),
                'Product_Section',
                true
            );

        List<SectionDTO> out = new List<SectionDTO>();

        for (ConnectApi.ManagedContentVersion mc : col.items) {
            Map<String, ConnectApi.ManagedContentNodeValue> nodes = mc.contentNodes;

            String itemProductSlug = getTextNode(nodes, 'ProductSlug');
            String itemGroup       = getTextNode(nodes, 'Group');

            // Filter in Apex instead of using filterBy
            if (!String.isBlank(productSlug) &&
                (itemProductSlug == null || !productSlug.equalsIgnoreCase(itemProductSlug))) {
                continue;
            }
            if (!String.isBlank(groupName) &&
                (itemGroup == null || !groupName.equalsIgnoreCase(itemGroup))) {
                continue;
            }

            SectionDTO s = new SectionDTO();
            s.Title        = getTextNode(nodes, 'Title');
            s.GroupName    = itemGroup;
            s.SectionKey   = getTextNode(nodes, 'SectionKey');
            s.Order        = getTextNode(nodes, 'Order');
            s.Subtitle     = getTextNode(nodes, 'Subtitle');
            s.ProductSlug  = itemProductSlug;
            s.AutoQuery    = getTextNode(nodes, 'AutoQuery');
            s.AutoCategory = getTextNode(nodes, 'AutoCategory');
            s.AutoEngine   = getTextNode(nodes, 'AutoEngine');
            s.AutoTags     = getTextNode(nodes, 'AutoTags');

            String manual = getTextNode(nodes, 'ManualItems');
            s.ManualItems = String.isBlank(manual)
                ? new List<String>()
                : new List<String>(manual.split('\\r?\\n'));

            out.add(s);
        }

        // Sort on numeric Order
        out.sort(new SectionComparator());
        return out;
    }

    // Properly-typed comparator
    private class SectionComparator implements System.Comparator<SectionDTO> {
        public Integer compare(SectionDTO a, SectionDTO b) {
            Integer ao = toInt(a.Order);
            Integer bo = toInt(b.Order);
            return ao - bo;
        }
    }

    // ---------- Documents ----------

    @AuraEnabled(cacheable=true)
    public static List<DocDTO> getDocumentsByUrlNames(List<String> urlNames) {
        if (urlNames == null || urlNames.isEmpty()) {
            return new List<DocDTO>();
        }

        // Get a reasonable slice of cms_document content and filter by contentUrlName
        ConnectApi.ManagedContentVersionCollection col =
            ConnectApi.ManagedContent.getAllManagedContent(
                String.valueOf(net()),
                0,
                Math.max(50, urlNames.size()),
                UserInfo.getLanguage(),
                'cms_document',
                true
            );

        Set<String> urlSet = new Set<String>(urlNames);
        List<DocDTO> result = new List<DocDTO>();

        for (ConnectApi.ManagedContentVersion v : col.items) {
            if (!urlSet.contains(v.contentUrlName)) {
                continue;
            }
            result.add(toDoc(v));
        }
        return result;
    }

    // Naive auto-query by tokens (matches altText/title)
    @AuraEnabled(cacheable=true)
    public static List<DocDTO> autoQueryDocuments(String productSlug, String category, String engine, String tagsCsv) {
        ConnectApi.ManagedContentVersionCollection col =
            ConnectApi.ManagedContent.getAllManagedContent(
                String.valueOf(net()),
                0,
                200,
                UserInfo.getLanguage(),
                'cms_document',
                true
            );

        // Build token set
        Set<String> tokens = new Set<String>();
        if (!String.isBlank(productSlug)) tokens.add(productSlug.toLowerCase());
        if (!String.isBlank(category))    tokens.add(category.toLowerCase());
        if (!String.isBlank(engine))      tokens.add(engine.toLowerCase());
        if (!String.isBlank(tagsCsv)) {
            for (String t : tagsCsv.split('\\s*,\\s*')) {
                if (!String.isBlank(t)) tokens.add(t.toLowerCase());
            }
        }

        List<DocDTO> all = toDocs(col);
        List<DocDTO> out = new List<DocDTO>();

        for (DocDTO d : all) {
            String hay = ((d.title == null ? '' : d.title) + '|' +
                          (d.altText == null ? '' : d.altText)).toLowerCase();
            Boolean keep = true;
            for (String t : tokens) {
                if (!hay.contains(t)) {
                    keep = false;
                    break;
                }
            }
            if (keep) out.add(d);
        }
        return out;
    }

    // Get documents by slug prefix (e.g., all docs starting with "client-releases-")
    @AuraEnabled(cacheable=true)
    public static List<DocDTO> getDocumentsByPrefix(String slugPrefix) {
        if (String.isBlank(slugPrefix)) {
            return new List<DocDTO>();
        }

        ConnectApi.ManagedContentVersionCollection col =
            ConnectApi.ManagedContent.getAllManagedContent(
                String.valueOf(net()),
                0,
                200,
                UserInfo.getLanguage(),
                'cms_document',
                true
            );

        List<DocDTO> result = new List<DocDTO>();
        String prefix = slugPrefix.toLowerCase();

        for (ConnectApi.ManagedContentVersion v : col.items) {
            if (v.contentUrlName != null && v.contentUrlName.toLowerCase().startsWith(prefix)) {
                result.add(toDoc(v));
            }
        }
        
        return result;
    }

    private static List<DocDTO> toDocs(ConnectApi.ManagedContentVersionCollection col) {
        List<DocDTO> out = new List<DocDTO>();
        if (col == null || col.items == null) return out;

        for (ConnectApi.ManagedContentVersion v : col.items) {
            out.add(toDoc(v));
        }
        return out;
    }

    private static DocDTO toDoc(ConnectApi.ManagedContentVersion v) {
        DocDTO d = new DocDTO();
        Map<String, ConnectApi.ManagedContentNodeValue> nodes = v.contentNodes;

        d.title      = getTextNode(nodes, 'title');
        d.altText    = getTextNode(nodes, 'altText');
        // If you have a dedicated thumb field, change the key here
        d.thumbUrl   = getMediaUrl(nodes, 'thumbnail', true);
        d.urlName    = v.contentUrlName;
        d.contentKey = v.contentKey;
        // Standard Document "source" media node -> file URL
        d.fileUrl    = getMediaUrl(nodes, 'source', false);

        return d;
    }

    // ---------- Releases ----------

    @AuraEnabled(cacheable=true)
    public static List<ReleaseDTO> getReleases(String productSlug) {
        ConnectApi.ManagedContentVersionCollection col =
            ConnectApi.ManagedContent.getAllManagedContent(
                String.valueOf(net()),
                0,
                200,
                UserInfo.getLanguage(),
                'Product_Release',
                true
            );

        List<ReleaseDTO> out = new List<ReleaseDTO>();

        for (ConnectApi.ManagedContentVersion mc : col.items) {
            Map<String, ConnectApi.ManagedContentNodeValue> nodes = mc.contentNodes;

            String itemProductSlug = getTextNode(nodes, 'ProductSlug');
            if (!String.isBlank(productSlug) &&
                (itemProductSlug == null || !productSlug.equalsIgnoreCase(itemProductSlug))) {
                continue;
            }

            ReleaseDTO r = new ReleaseDTO();
            r.Title           = getTextNode(nodes, 'Title');
            r.PublishedDate   = getDateNode(nodes, 'PublishedDate');
            r.ItemOrder       = getTextNode(nodes, 'ItemOrder');
            r.ExternalDocSlug = getTextNode(nodes, 'ExternalDocSlug');
            r.InternalDocSlug = getTextNode(nodes, 'InternalDocSlug');

            out.add(r);
        }

        out.sort(new ReleaseComparator());
        return out;
    }

    private class ReleaseComparator implements System.Comparator<ReleaseDTO> {
        public Integer compare(ReleaseDTO ra, ReleaseDTO rb) {
            // Newest date first
            Date da = ra.PublishedDate;
            Date db = rb.PublishedDate;

            if (da != null && db != null && !da.equals(db)) {
                Integer daVal = da.daysBetween(Date.newInstance(1900, 1, 1));
                Integer dbVal = db.daysBetween(Date.newInstance(1900, 1, 1));
                return dbVal - daVal;
            }
            if (da != null && db == null) return -1;
            if (da == null && db != null) return 1;

            // Same date (or both null): higher ItemOrder first
            return toInt(rb.ItemOrder) - toInt(ra.ItemOrder);
        }
    }

    // Resolve two slugs to URLs (one call from LWC)
    @AuraEnabled(cacheable=true)
    public static List<ReleaseViewDTO> getReleaseViews(String productSlug, Boolean includeInternal) {
        List<ReleaseDTO> rels = getReleases(productSlug);

        // Collect slugs to resolve
        Set<String> slugs = new Set<String>();
        for (ReleaseDTO r : rels) {
            if (!String.isBlank(r.ExternalDocSlug)) slugs.add(r.ExternalDocSlug);
            if (includeInternal && !String.isBlank(r.InternalDocSlug)) slugs.add(r.InternalDocSlug);
        }

        Map<String, DocDTO> bySlug = new Map<String, DocDTO>();
        if (!slugs.isEmpty()) {
            for (DocDTO d : getDocumentsByUrlNames(new List<String>(slugs))) {
                bySlug.put(d.urlName, d);
            }
        }

        List<ReleaseViewDTO> out = new List<ReleaseViewDTO>();
        for (ReleaseDTO r : rels) {
            ReleaseViewDTO v = new ReleaseViewDTO();
            v.title         = r.Title;
            v.publishedDate = r.PublishedDate;
            v.externalUrl   = bySlug.containsKey(r.ExternalDocSlug)
                              ? bySlug.get(r.ExternalDocSlug).fileUrl
                              : null;
            v.internalUrl   = includeInternal && bySlug.containsKey(r.InternalDocSlug)
                              ? bySlug.get(r.InternalDocSlug).fileUrl
                              : null;
            out.add(v);
        }
        return out;
    }
}
