<?php 
    $dataArray = array ($_POST['id'], 
                        $_POST['zero'], 
                        $_POST['one'], 
                        $_POST['two'], 
                        $_POST['three'], 
                        $_POST['four'], 
                        $_POST['five'], 
                        $_POST['six'], 
                        $_POST['seven']);

    $csvHandler = fopen ('patterns', 'a');
    fputcsv ($csvHandler, $dataArray, "|");
    fclose ($csvHandler);
?>