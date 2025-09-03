#!/bin/bash
# =================================
# Price Tracker Setup Script
# סקריפט התקנה אוטומטית למעקב מחירים
# =================================

set -e  # יציאה במקרה של שגיאה

# צבעים לפלט
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# פונקציות עזר
print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_header() {
    echo -e "\n${BLUE}=== $1 ===${NC}\n"
}

# בדיקת מערכת הפעלה
detect_os() {
    if [[ "$OSTYPE" == "linux-gnu"* ]]; then
        OS="linux"
        if command -v apt-get >/dev/null 2>&1; then
            DISTRO="debian"
        elif command -v yum >/dev/null 2>&1; then
            DISTRO="rhel"
        fi
    elif [[ "$OSTYPE" == "darwin"* ]]; then
        OS="macos"
    else
        print_error "מערכת הפעלה לא נתמכת: $OSTYPE"
        exit 1
    fi
    print_info "זוהתה מערכת הפעלה: $OS"
}

# בדיקת תלויות
check_dependencies() {
    print_header "בדיקת תלויות"
    
    # בדיקת Python
    if ! command -v python3 >/dev/null 2>&1; then
        print_error "Python 3 לא מותקן"
        exit 1
    fi
    
    PYTHON_VERSION=$(python3 -c 'import sys; print(".".join(map(str, sys.version_info[:2])))')
    print_info "Python version: $PYTHON_VERSION"
    
    # בדיקת pip
    if ! command -v pip3 >/dev/null 2>&1; then
        print_error "pip3 לא מותקן"
        exit 1
    fi
    
    # בדיקת Node.js
    if ! command -v node >/dev/null 2>&1; then
        print_warning "Node.js לא מותקן - נדרש לפיתוח Frontend"
    else
        NODE_VERSION=$(node --version)
        print_info "Node.js version: $NODE_VERSION"
    fi
    
    # בדיקת Docker
    if ! command -v docker >/dev/null 2>&1; then
        print_warning "Docker לא מותקן - נדרש לסביבת production"
    else
        DOCKER_VERSION=$(docker --version | cut -d ' ' -f3 | sed 's/,$//')
        print_info "Docker version: $DOCKER_VERSION"
    fi
    
    print_success "בדיקת תלויות הושלמה"
}

# התקנת תלויות מערכת
install_system_dependencies() {
    print_header "התקנת תלויות מערכת"
    
    if [[ "$OS" == "linux" ]]; then
        if [[ "$DISTRO" == "debian" ]]; then
            print_info "מתקין חבילות עבור Ubuntu/Debian..."
            sudo apt-get update
            sudo apt-get install -y \
                python3-venv \
                python3-dev \
                postgresql-client \
                redis-tools \
                curl \
                wget \
                git \
                build-essential \
                libpq-dev \
                libffi-dev \
                libssl-dev
                
            # התקנת Chrome לScraping
            print_info "מתקין Google Chrome..."
            wget -q -O - https://dl-ssl.google.com/linux/linux_signing_key.pub | sudo apt-key add -
            echo "deb [arch=amd64] http://dl.google.com/linux/chrome/deb/ stable main" | sudo tee /etc/apt/sources.list.d/google-chrome.list
            sudo apt-get update
            sudo apt-get install -y google-chrome-stable
            
        elif [[ "$DISTRO" == "rhel" ]]; then
            print_info "מתקין חבילות עבור RHEL/CentOS..."
            sudo yum update -y
            sudo yum install -y \
                python3-devel \
                postgresql-devel \
                redis \
                curl \
                wget \
                git \
                gcc \
                gcc-c++ \
                openssl-devel \
                libffi-devel
        fi
        
    elif [[ "$OS" == "macos" ]]; then
        print_info "מתקין חבילות עבור macOS..."
        if ! command -v brew >/dev/null 2>&1; then
            print_info "מתקין Homebrew..."
            /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
        fi
        
        brew update
        brew install \
            python@3.11 \
            postgresql@15 \
            redis \
            git \
            wget
            
        # התקנת Chrome
        brew install --cask google-chrome
    fi
    
    print_success "תלויות מערכת הותקנו בהצלחה"
}

# יצירת סביבת Python וירטואלית
create_python_venv() {
    print_header "יצירת סביבת Python וירטואלית"
    
    if [[ -d "venv" ]]; then
        print_warning "סביבה וירטואלית קיימת - מוחק..."
        rm -rf venv
    fi
    
    python3 -m venv venv
    source venv/bin/activate
    
    print_info "משדרג pip..."
    pip install --upgrade pip
    
    print_info "מתקין חבילות Python..."
    pip install -r requirements.txt
    
    print_success "סביבת Python וירטואלית נוצרה בהצלחה"
}

# הגדרת בסיס נתונים
setup_database() {
    print_header "הגדרת בסיס נתונים"
    
    # בדיקה אם PostgreSQL רץ
    if command -v pg_isready >/dev/null 2>&1; then
        if pg_isready -h localhost -p 5432 >/dev/null 2>&1; then
            print_info "PostgreSQL זמין"
            
            # יצירת בסיס נתונים
            print_info "יוצר בסיס נתונים..."
            createdb price_tracker 2>/dev/null || print_warning "בסיס נתונים כבר קיים"
            
        else
            print_warning "PostgreSQL לא רץ - משתמש ב-SQLite לפיתוח"
            export DATABASE_URL="sqlite:///price_tracker.db"
        fi
    else
        print_warning "PostgreSQL לא מותקן - משתמש ב-SQLite לפיתוח"
        export DATABASE_URL="sqlite:///price_tracker.db"
    fi
    
    # הרצת migration
    if [[ -f "backend/app.py" ]]; then
        print_info "מריץ database migrations..."
        cd backend
        python -c "from app import create_tables; create_tables()"
        cd ..
    fi
    
    print_success "בסיס נתונים הוגדר בהצלחה"
}

# הגדרת Redis
setup_redis() {
    print_header "הגדרת Redis"
    
    if command -v redis-cli >/dev/null 2>&1; then
        if redis-cli ping >/dev/null 2>&1; then
            print_success "Redis זמין"
        else
            print_info "מתחיל Redis..."
            if [[ "$OS" == "macos" ]]; then
                brew services start redis
            elif [[ "$OS" == "linux" ]]; then
                sudo systemctl start redis-server || sudo service redis-server start
            fi
        fi
    else
        print_warning "Redis לא מותקן - task queue לא יעבוד"
    fi
}

# הגדרת קבצי הגדרות
setup_config() {
    print_header "הגדרת קבצי הגדרות"
    
    if [[ ! -f ".env" ]]; then
        print_info "יוצר קובץ .env מהתבנית..."
        cp .env.example .env
        
        # עדכון הגדרות בסיסיות
        if [[ "$DATABASE_URL" ]]; then
            sed -i.bak "s|DATABASE_URL=.*|DATABASE_URL=$DATABASE_URL|" .env
        fi
        
        # יצירת מפתחות סודיים
        SECRET_KEY=$(python3 -c "import secrets; print(secrets.token_urlsafe(32))")
        JWT_SECRET_KEY=$(python3 -c "import secrets; print(secrets.token_urlsafe(32))")
        
        sed -i.bak "s|SECRET_KEY=.*|SECRET_KEY=$SECRET_KEY|" .env
        sed -i.bak "s|JWT_SECRET_KEY=.*|JWT_SECRET_KEY=$JWT_SECRET_KEY|" .env
        
        rm .env.bak 2>/dev/null || true
        
        print_success "קובץ .env נוצר - עדכן את השירותים החיצוניים"
    else
        print_info "קובץ .env קיים"
    fi
    
    # יצירת תיקיות נדרשות
    mkdir -p logs uploads static/images
    
    print_success "קבצי הגדרות מוכנים"
}

# התקנת Frontend
setup_frontend() {
    print_header "הגדרת Frontend"
    
    if [[ -d "frontend" ]] && command -v npm >/dev/null 2>&1; then
        print_info "מתקין תלויות Frontend..."
        cd frontend
        npm install
        
        print_info "בונה Frontend..."
        npm run build
        cd ..
        
        print_success "Frontend הוכן בהצלחה"
    else
        print_warning "Frontend לא נמצא או npm לא מותקן"
    fi
}

# יצירת services systemd (Linux)
create_systemd_services() {
    if [[ "$OS" != "linux" ]]; then
        return
    fi
    
    print_header "יצירת systemd services"
    
    PROJECT_DIR=$(pwd)
    USER=$(whoami)
    
    # Price Tracker API Service
    sudo tee /etc/systemd/system/price-tracker-api.service > /dev/null <<EOF
[Unit]
Description=Price Tracker API
After=network.target postgresql.service redis.service

[Service]
Type=simple
User=$USER
WorkingDirectory=$PROJECT_DIR
Environment=PATH=$PROJECT_DIR/venv/bin
ExecStart=$PROJECT_DIR/venv/bin/gunicorn --bind 0.0.0.0:5000 --workers 4 app:app
ExecReload=/bin/kill -s HUP \$MAINPID
Restart=always

[Install]
WantedBy=multi-user.target
EOF

    # Celery Worker Service
    sudo tee /etc/systemd/system/price-tracker-worker.service > /dev/null <<EOF
[Unit]
Description=Price Tracker Celery Worker
After=network.target redis.service

[Service]
Type=simple
User=$USER
WorkingDirectory=$PROJECT_DIR/backend
Environment=PATH=$PROJECT_DIR/venv/bin
ExecStart=$PROJECT_DIR/venv/bin/celery -A services.price_monitor worker --loglevel=info
Restart=always

[Install]
WantedBy=multi-user.target
EOF

    # Celery Beat Service
    sudo tee /etc/systemd/system/price-tracker-beat.service > /dev/null <<EOF
[Unit]
Description=Price Tracker Celery Beat
After=network.target redis.service

[Service]
Type=simple
User=$USER
WorkingDirectory=$PROJECT_DIR/backend
Environment=PATH=$PROJECT_DIR/venv/bin
ExecStart=$PROJECT_DIR/venv/bin/celery -A services.price_monitor beat --loglevel=info
Restart=always

[Install]
WantedBy=multi-user.target
EOF

    sudo systemctl daemon-reload
    
    print_success "systemd services נוצרו"
    print_info "להפעלה: sudo systemctl enable --now price-tracker-api"
}

# בדיקת התקנה
test_installation() {
    print_header "בדיקת התקנה"
    
    # בדיקת API
    if [[ -f "venv/bin/activate" ]]; then
        source venv/bin/activate
        
        print_info "מריץ את השרת לבדיקה..."
        cd backend
        timeout 10s python app.py &
        SERVER_PID=$!
        
        sleep 5
        
        if curl -f http://localhost:5000/api/health >/dev/null 2>&1; then
            print_success "API עובד בהצלחה!"
        else
            print_warning "API לא מגיב - בדוק את ה-logs"
        fi
        
        kill $SERVER_PID 2>/dev/null || true
        cd ..
    fi
    
    # בדיקת Frontend
    if [[ -d "frontend/build" ]]; then
        print_success "Frontend נבנה בהצלחה"
    fi
    
    print_success "בדיקת התקנה הושלמה"
}

# הצגת הוראות לאחר התקנה
show_post_install_instructions() {
    print_header "הוראות לאחר התקנה"
    
    echo -e "${GREEN}🎉 התקנה הושלמה בהצלחה!${NC}\n"
    
    echo -e "${YELLOW}צעדים הבאים:${NC}"
    echo -e "1. ערוך את קובץ ${BLUE}.env${NC} והוסף מפתחות API:"
    echo -e "   - SendGrid API key לאימיילים"
    echo -e "   - Twilio credentials ל-SMS"
    echo -e "   - הגדרות proxy אם נדרש"
    echo ""
    echo -e "2. להרצה בסביבת פיתוח:"
    echo -e "   ${BLUE}source venv/bin/activate${NC}"
    echo -e "   ${BLUE}cd backend && python app.py${NC}"
    echo ""
    echo -e "3. להרצת workers ברקע:"
    echo -e "   ${BLUE}celery -A backend.services.price_monitor worker --loglevel=info${NC}"
    echo -e "   ${BLUE}celery -A backend.services.price_monitor beat --loglevel=info${NC}"
    echo ""
    echo -e "4. להרצה עם Docker:"
    echo -e "   ${BLUE}docker-compose up -d${NC}"
    echo ""
    echo -e "5. גישה לממשקים:"
    echo -e "   - API: ${BLUE}http://localhost:5000${NC}"
    echo -e "   - Frontend: ${BLUE}http://localhost:3000${NC}"
    echo -e "   - Monitoring: ${BLUE}http://localhost:3000${NC}"
    echo ""
    echo -e "${YELLOW}תיעוד מלא:${NC} https://github.com/yourusername/price-tracker/blob/main/README.md"
    echo ""
    echo -e "${GREEN}בהצלחה! 🚀${NC}"
}

# פונקציה ראשית
main() {
    clear
    echo -e "${BLUE}"
    echo "  ╔══════════════════════════════════════╗"
    echo "  ║       🛒 Price Tracker Setup         ║"
    echo "  ║      סקריפט התקנה אוטומטי           ║"
    echo "  ╚══════════════════════════════════════╝"
    echo -e "${NC}\n"
    
    # בדיקת הרשאות
    if [[ $EUID -eq 0 ]]; then
        print_error "אל תריץ כ-root משתמש"
        exit 1
    fi
    
    detect_os
    check_dependencies
    
    # אישור המשך
    read -p "האם להמשיך בהתקנה? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        print_info "התקנה בוטלה"
        exit 0
    fi
    
    # תהליך התקנה
    install_system_dependencies
    create_python_venv
    setup_database
    setup_redis
    setup_config
    setup_frontend
    create_systemd_services
    test_installation
    show_post_install_instructions
}

# הרצת הסקריפט
main "$@"