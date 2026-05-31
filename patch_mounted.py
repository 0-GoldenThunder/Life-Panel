import os
import re

components_dir = r"C:\Users\delig\VS code stuff\Other project\FrontEndProject\My_Creation\Life Panel\src\components"

# List of components that use useStore($isDbReady) or just need useMounted
targets = [
    "AIAdvisor.tsx",
    "MonthlySpendCard.tsx",
    "NetBalanceCard.tsx",
    "UpcomingPaymentsCard.tsx",
    "TransactionManager.tsx",
    "EventCalendar.tsx",
    "TaskManager.tsx",
    "GrowthAnalytics.tsx",
    "RecurringManager.tsx"
]

def process_file(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    original_content = content
    
    # 1. Check if we need to add the import
    if "useMounted" not in content:
        # add import useMounted at the top (after the first import)
        content = re.sub(r"import React", "import React\nimport { useMounted } from '@/hooks/useMounted';", content, count=1)
        if "import React" not in content:
            content = "import { useMounted } from '../../hooks/useMounted';\n" + content

    # 2. Replace const isDbReady = useStore($isDbReady);
    # with const isDbReadyRaw = useStore($isDbReady); const mounted = useMounted(); const isDbReady = isDbReadyRaw && mounted;
    
    # But some might just use $transactions directly without checking $isDbReady, 
    # which also causes hydration mismatches. 
    # To be safe, we just wrap the whole render or we just replace the $isDbReady logic.
    # The hydration error in TransactionManager was because of isDbReady. 
    # Actually, the error was because $transactions has data and isDbReady is true on the client!
    # Let's see how we can systematically fix this.
    pass

