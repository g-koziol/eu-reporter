# Ewidencja działań projektowych

## Uruchomienie lokalne

Wymagany jest Node.js 22.22.3 lub nowszy.

```sh
npm install
npm start
```

Otwórz adres wyświetlony przez Angular CLI. Wersję produkcyjną można zbudować poleceniem `npm run build`; pliki wynikowe znajdują się w `dist/eu-reporter/browser/`.

Testy komponentów, stanu aplikacji i migracji bazy danych uruchomisz poleceniem `npm test`.

## Struktura aplikacji

Komponenty są pogrupowane w `src/features/` według obszarów kalendarza, konfiguracji i wprowadzania danych. Wspólne elementy interfejsu znajdują się w `src/shared/`, a stan aplikacji i persystencja w `src/core/`.

## Publikacja w GitHub Pages

Workflow GitHub Actions w `.github/workflows/deploy.yml` buduje aplikację przy zmianach na `main` i przy pull requestach do `main`. Po scaleniu do `main` publikuje ją pod adresem https://g-koziol.github.io/eu-reporter/.

Przed pierwszą publikacją w ustawieniach repozytorium wybierz **Settings → Pages → Build and deployment → Source → GitHub Actions**. Workflow można również uruchomić ręcznie z zakładki **Actions**. Budowanie ustawia ścieżkę bazową `/eu-reporter/`, wymaganą dla strony projektu GitHub Pages.

## Dane i kopie zapasowe

Dane aplikacji zapisują się automatycznie w IndexedDB tej przeglądarki i pozostają dostępne po ponownym wejściu na stronę. Przy pierwszym uruchomieniu istniejące dane z `localStorage` są przenoszone do IndexedDB. Usunięcie danych witryny w przeglądarce usuwa również ten zapis, dlatego zalecane jest okresowe korzystanie z eksportu JSON.

Baza IndexedDB przechowuje konfigurację, miesiące, słowniki projektów i metadane w osobnych magazynach. W metadanych zapisywana jest semantyczna wersja schematu, obecnie `1.1.0`; liczbowy numer IndexedDB służy wyłącznie do zmian magazynów.

Przed migracją istniejąca baza jest kopiowana do osobnej bazy o nazwie zakończonej `_backup_<wersja>`. Zmiany schematu aplikacji należy wersjonować semantycznie i rejestrować w `SCHEMA_MIGRATIONS`; migracje uruchamiają się rosnąco po wersji. Dane z poprzedniego, pojedynczego rekordu `appData` są migrowane automatycznie, a wcześniejsze wpisy tekstowe tworzą słowniki projektu.

Słowniki są przypisane do pary projekt/pole. Można je edytować na stronie **Słowniki**; podpowiedzi w polach kalendarza i masowego dodawania wyszukują zapisane wartości pełnotekstowo.

Eksport i import zachowują dotychczasowy format danych, w tym konfigurację oraz miesięczne wpisy. Pliki JSON mogą być opcjonalnie szyfrowane hasłem.