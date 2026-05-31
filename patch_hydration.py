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

fallback_html = '>\n  <div slot="fallback" class="p-8 text-center border border-[#222] rounded-xl bg-[#0A0A0A]/30 text-platinum/40"><span class="animate-pulse">Loading...</span></div>\n</{tag}>'

def process_file(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    original_content = content
    for comp in components_to_patch:
        # Match <Component client:load /> or <Component prop="x" client:load />
        # We need to capture the tag name and everything before client:load
        pattern = r'<(' + comp + r')([^>]*?)client:load\s*/>'
        
        def replacer(match):
            tag = match.group(1)
            props = match.group(2)
            # Create the replacement
            return f'<{tag}{props}client:only="react"{fallback_html.format(tag=tag)}'

        content = re.sub(pattern, replacer, content)

    if content != original_content:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f"Patched {os.path.basename(filepath)}")

for root, dirs, files in os.walk(astro_dir):
    for file in files:
        if file.endswith('.astro'):
            process_file(os.path.join(root, file))
