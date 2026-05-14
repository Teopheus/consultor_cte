import pyautogui
import pyperclip
import time

# Desliga o atraso padrão de 100ms que o PyAutoGUI coloca em todo comando
pyautogui.PAUSE = 0 

# --- CONFIGURAÇÕES TURBO ---
TOTAL_CHAVES = 1500                                                                                                                              
ATRASO_ENTRE_TECLAS = 0.01 # Apenas 10 milissegundos
ATRASO_COPIA = 0.02        # Tempo mínimo para o Windows registrar o Ctrl+C
TECLA_PROXIMO = 'tab'      # Mude para 'down' se o Tab pular para o lugar errado

chaves_extraidas = set()

print("⚠️  ATENÇÃO: O robô vai assumir o teclado em 5 segundos.")
print("👉 CLIQUE NO PRIMEIRO CAMPO DE CHAVE LÁ NO SISTEMA AGORA!")
print("🛑 EMERGÊNCIA: Para parar o robô, arraste o mouse violentamente para qualquer canto do monitor!")
time.sleep(5)

print("\n Iniciando extração...")
tempo_inicio = time.time()

for i in range(TOTAL_CHAVES):
    # 1. Limpa a área de transferência
    pyperclip.copy('')
    
    # 2. Copia o conteúdo do campo atual
    pyautogui.hotkey('ctrl', 'c')
    time.sleep(ATRASO_COPIA) 
    
    # 3. Pega o texto copiado
    chave = pyperclip.paste().strip()
    
    # 4. Valida se é uma chave SEFAZ (44 números)
    if len(chave) == 44 and chave.isdigit():
        chaves_extraidas.add(chave)
        # Imprime a cada 100 chaves para o terminal não ser o gargalo da velocidade
        if len(chaves_extraidas) % 100 == 0:
            print(f"⚡ Capturadas: {len(chaves_extraidas)}/{TOTAL_CHAVES}...")
    
    # 5. Pula para o próximo campo
    pyautogui.press(TECLA_PROXIMO)
    time.sleep(ATRASO_ENTRE_TECLAS)

# --- SALVANDO O RESULTADO ---
with open('chaves_limpas.txt', 'w', encoding='utf-8') as arquivo_saida:
    arquivo_saida.write('\n'.join(chaves_extraidas))

tempo_fim = time.time()
duracao = round(tempo_fim - tempo_inicio, 2)

print("\n✅ EXTRAÇÃO CONCLUÍDA COM SUCESSO!")
print(f"⏱️ Tempo total: {duracao} segundos.")
print(f"📁 Foram salvas {len(chaves_extraidas)} chaves únicas no arquivo 'chaves_limpas.txt'.")