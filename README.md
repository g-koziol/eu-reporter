# Ewidencja działań projektowych

## Uruchomienie lokalne

Wymagany jest Node.js 22.22.3 lub nowszy.

```sh
npm install
npm start
```

Otwórz adres wyświetlony przez Angular CLI. Wersję produkcyjną można zbudować poleceniem `npm run build`; pliki wynikowe znajdują się w `dist/eu-reporter/`.

## Dane i kopie zapasowe

Dane aplikacji zapisują się automatycznie w IndexedDB tej przeglądarki i pozostają dostępne po ponownym wejściu na stronę. Przy pierwszym uruchomieniu istniejące dane z `localStorage` są przenoszone do IndexedDB. Usunięcie danych witryny w przeglądarce usuwa również ten zapis, dlatego zalecane jest okresowe korzystanie z eksportu JSON.

Eksport i import zachowują dotychczasowy format danych, w tym konfigurację oraz miesięczne wpisy. Pliki JSON mogą być opcjonalnie szyfrowane hasłem.