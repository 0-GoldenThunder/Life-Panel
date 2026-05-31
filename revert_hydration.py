import os
import re

astro_dir = r"C:\Users\delig\VS code stuff\Other project\FrontEndProject\My_Creation\Life Panel\src\pages"

components_to_patch = [
    "TransactionManager",
    "NetBalanceCard",
    "MonthlySpendCard",
    "UpcomingPaymentsCard",
    "FinanceMiniChart",
    "UpcomingEventsCard",
    "GrowthMiniChart",
    "PersonalSnapshot",
    "BusinessSnapshot",
    "OverallFinancialStatusChart",
    "EventCalendar",
    "TaskManager",
    "GrowthAnalytics",
    "RecurringManager"
]

def process_file(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    original_content = content
    for comp in components_to_patch:
        # We want to match:
        # <Component props client:only="react">
        #   <div slot="fallback"...>...</div>
        # </Component>
        # And replace it with <Component props client:load />
        
        pattern = r'<(' + comp + r')([^>]*?)client:only="react">(?:.*?)<\/\1>'
        
        def replacer(match):
            tag = match.group(1)
            props = match.group(2)
            # Create the replacement
            return f'<{tag}{props}client:load />'

        content = re.sub(pattern, replacer, content, flags=re.DOTALL)

    if content != original_content:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f"Reverted {os.path.basename(filepath)}")

for root, dirs, files in os.walk(astro_dir):
    for file in files:
        if file.endswith('.astro'):
            process_file(os.path.join(root, file))
